import { WebUI } from "https://deno.land/x/webui@2.4.3/mod.ts"

import {micromark} from 'https://esm.sh/micromark@3.2.0'
import {gfm, gfmHtml} from 'https://esm.sh/micromark-extension-gfm@2.0.3'

import dialog from "npm:node-file-dialog@1.0.3"
import macos from "npm:macos-open-file-dialog@1.0.1"

import * as path from "https://deno.land/std@0.210.0/path/mod.ts";
import { escapeHtml } from "https://deno.land/x/escape_html@1.0.0/mod.ts"

const render = (md: string, dt: Date) => {
    const html = micromark(md, 'utf8', {
        allowDangerousHtml: true,
        extensions: [gfm()],
        htmlExtensions: [gfmHtml()]
      })
    return html + `<div class="content is-small">${dt}</div>`
}


// const g_ITEM_LIMIT = 5
const g_ITEM_LIMIT = 30
let g_dir = ""

/*
    patに従うディレクトリ名（0パディングの数字）を数字的に新しい順にsortした配列として返す。
*/
const readDirs = async(dirPath:string, pat:RegExp) => {
    const ret : string[] = []
    for await (const dirEntry of Deno.readDir(dirPath)) {
        if(dirEntry.isDirectory && dirEntry.name.match(pat))
            ret.push(dirEntry.name)
    }

    ret.sort(  (a, b) => a < b ? 1 : -1 )
    return ret
}

/*
  4桁の数字のdirを数字的にあたらしい順にsortした配列として返す。
*/
const readYears = async(dirPath: string) => {
    return await readDirs( dirPath, /^[0-9][0-9][0-9][0-9]$/)
}

/*
  2桁の数字のdirを数字的に新しい順にsortした配列として返す
*/
const readMonths = async(dirPath:string, yearstr:string) => {
    const targetDir = path.join(dirPath, yearstr)
    return await readDirs( targetDir, /^[0-9][0-9]$/)
} 

const readDays = async(dirPath:string, yearstr:string, monthstr:string) => {
    const targetDir = path.join(dirPath, yearstr, monthstr)
    return await readDirs( targetDir, /^[0-9][0-9]$/)
}

const readFilePathsAt = async(dirPath:string, yearstr:string, monthstr:string, daystr:string) => {
    const targetPath = path.join(dirPath, yearstr, monthstr, daystr)
    const ret : string[] = []
    for await (const dirEntry of Deno.readDir(targetPath)) {
        if(dirEntry.isFile && dirEntry.name.match(/^[0-9]+\.md$/))
            ret.push(dirEntry.name)
    }
    ret.sort(  (a, b) => a < b ? 1 : -1 )
    return ret.map(fname => { return {fullPath: path.join(targetPath, fname), fname: fname} })
}

const fullPath2Date = (fullPath:string) => {
    return new Date(parseInt(path.basename(fullPath, ".md")))
}


interface FilePath {
    fullPath: string
    fname: string
}


const readFilePaths = async(dirPath:string, count:number) => {
    const years = await readYears(dirPath)
    let ret :FilePath[] = []
    for (const year of years) {
        const months = await readMonths(dirPath, year)
        for (const month of months) {
            const days = await readDays(dirPath, year, month)
            for (const day of days) {
                const cur = await readFilePathsAt(dirPath, year, month, day)
                ret = ret.concat(cur)
                if (ret.length > count)
                    return ret
            }
        }
    }
    return ret
}

interface Cell {
    fullPath: string
    date: Date
    md: string
}


const loadDir = async (dirPath:string) => {
    const paths = await readFilePaths(dirPath, g_ITEM_LIMIT)
    const limited = paths.length <= g_ITEM_LIMIT ? paths : paths.slice(0, g_ITEM_LIMIT)
    const cells : Cell[] = await Promise.all(
        limited
        .map( async pathpair => {
            const date = new Date(parseInt(pathpair.fname.substring(0, pathpair.fname.length - 4)))
            const content = await Deno.readTextFile(pathpair.fullPath)
            return {fullPath: pathpair.fullPath, date: date, md: render(content, date)}
        })
    )

    const ret = renderCells(cells)
    await sendMessage("onLoadFullMd", ret)
}

const renderCell = (fullPath:string, innerHtml:string) => {
    return `<div class="box" fpath="${escapeHtml(fullPath)}">${innerHtml}</div>`
}

const renderCells = (cells: Cell[])=> {
    const ret : string[] = []
    for(const cell of cells)
    {
        ret.push(renderCell(cell.fullPath, cell.md))
    }
    return ret.join("\n")
}


try
{
    g_dir = await Deno.readTextFile("mddeck_settings.txt")
}catch
{
    // g_dir = "" is OK.
}

const saveRootDir = async(dir:string) => {
    await Deno.writeTextFile("mddeck_settings.txt", dir)
    g_dir = dir
}



const openDir = async() => {
    if (Deno.build.os == "darwin") {
        return await macos.openFolder("Select root dir")
    } else {
        try {
            const config = {type:'directory'}
            return (await dialog(config))[0]                
        }catch {
            return null
        }
    }
}


const myWindow = new WebUI()
const sendMessage = async(msg: string, arg:string) => {
    await myWindow.script(`g_handler["${msg}"](${JSON.stringify(arg)})`).catch(
        console.error,
    )    
}

const selectDir = async() => {
    const dir = await openDir()
    if (dir == null)
        return false

    await saveRootDir(dir)
    return true
}

myWindow.bind("chooseDir", async() => {
    if(!await selectDir())
        return ""

    await loadDir(g_dir)
})

myWindow.bind("onLoad", async () => {
    if (g_dir == "")
    {
        if(!await selectDir())
            return ""
    }
    await loadDir(g_dir)
})


const zeroPad = (num:number) => {
    if (num >= 10)
        return num.toString()
    return "0" + num.toString()
}

const ensureDir = async (dir:string) => {
    try {
        await Deno.mkdir(dir, {recursive: true} )
    }
    // deno-lint-ignore no-empty
    catch {
    }
}

const date2dir = (dt: Date) => {
    return path.join(g_dir, dt.getFullYear().toString(), zeroPad(dt.getMonth()+1), zeroPad(dt.getDate()))
}

const date2fullPath = (dt: Date) => {
    const targetDir = date2dir(dt)
    const fname = dt.getTime().toString() + ".md"
    return path.join(targetDir, fname)
}

const saveContent = async (dt:Date, text:string)=>{
    const targetDir = date2dir(dt)
    await ensureDir(targetDir)

    const full = date2fullPath(dt)
    await Deno.writeTextFile(full, text)
    return full
}


myWindow.bind("post", async(e) => {
    // return render(e.arg.string(0))
    const text = e.arg.string(0)
    const now = new Date()
    const full = await saveContent(now, text)

    sendMessage("onLoadOneMd", JSON.stringify({fullPath:full, innerHTML: render(text, now)}))

    return ""

})

myWindow.bind("box-click", async(e) => {
    const full = e.arg.string(0)
    const content = await Deno.readTextFile(full)

    sendMessage("startEdit", content)


    return ""
})

myWindow.bind("submit", async(e) => {
    const full = e.arg.string(0)
    const content = e.arg.string(1)

    await Deno.writeTextFile(full, content)   
    sendMessage("afterSubmit", JSON.stringify({fullPath:full, innerHTML: render(content, fullPath2Date(full))}))

    return ""
})


myWindow.show("client/main.html")

await WebUI.wait()