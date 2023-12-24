const g_handler = {}

window.addEventListener('load', (_)=> {
    // 少し待たないとwebsocketがつながってない、とか言われる。つながった時に来るコールバックとかないの？
    window.setTimeout(()=> {
        webui.call('onLoad')
    }, 500)

    /** @type {HTMLDivElement} */
    const contentRootDiv = document.getElementById('content-root')
    /** @type {HTMLDivElement} */
    const postDiv = document.getElementById("post-div")
    /** @type {HTMLTextAreaElement} */
    const postArea = postDiv.querySelector("#post-area")

    const postEdit = () => {
        webui.call('post', postArea.value).then((newCell)=> {
            /*

            const newDiv = document.createElement("div")
            newDiv.className = "box"
            newDiv.innerHTML = newCell
            Prism.highlightAllUnder(newDiv)
            contentRootDiv.insertBefore(newDiv, contentRootDiv.firstChild)
            */

        })
    }

    g_handler.onLoadOneMd = (jsonArg) => {
        postArea.value = ""

        const obj = JSON.parse(jsonArg)

        const newDiv = document.createElement("div")
        newDiv.className = "box"
        newDiv.setAttribute("fpath", obj.fullPath)
        newDiv.innerHTML = obj.innerHTML
        Prism.highlightAllUnder(newDiv)
        contentRootDiv.insertBefore(newDiv, contentRootDiv.firstChild)
    }

    g_handler.onLoadFullMd = (md) => {
        contentRootDiv.innerHTML = md        
        Prism.highlightAllUnder(contentRootDiv)
    }


    document.getElementById('submit-post').addEventListener('click', postEdit)
    document.getElementById('choose-dir').addEventListener('click', ()=> { webui.call('chooseDir', "") })

    postArea.addEventListener('keydown', (event)=>{
        if((event.keyCode == 10 || event.keyCode == 13)
            && (event.ctrlKey || event.metaKey)) {
            postEdit()        
        }
    })


})