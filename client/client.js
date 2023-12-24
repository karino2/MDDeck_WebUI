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
    /** @type {HTMLDivElement} */
    const editDiv = document.getElementById("edit-div")
    /** @type {HTMLTextAreaElement} */
    const editArea = editDiv.querySelector("#edit-area")


    const postEdit = () => {
        webui.call('post', postArea.value)
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

    /** @type {HTMLDivElement} */
    let lastSelected = null
    let targetFullPath = ""

    const onBodyClick = (event) => {
        const findTargetElem = (start) => {
            if (start.tagName == "body")
                return null
            if (start == contentRootDiv)
                return null
            let cur = start
            while (cur != contentRootDiv) {
                const fpath = cur.getAttribute('fpath')
                if (fpath != null)
                    return cur
                cur = cur.parentElement
            
                // not contentRootDiv child
                if (cur == null)
                    return null
            }
            return null
        }

        let topelem = findTargetElem(event.target) 
        if (!topelem)
            return
        const fpath = topelem.getAttribute('fpath')
        lastSelected = topelem
        targetFullPath = fpath
        webui.call("box-click", fpath)
    }


    const body = document.body
    body.addEventListener('click', onBodyClick) 
    
    document.getElementById('cancel-edit').addEventListener('click', ()=>{
        editDiv.style.display = 'none'
    })

    const submitEdit = ()=> {
        webui.call('submit', targetFullPath, editArea.value)
        editDiv.style.display = 'none'
    }
    
    document.getElementById('submit-edit').addEventListener('click', ()=>{
        submitEdit()
    })

    g_handler.afterSubmit = (jsonArg) => {
        const obj = JSON.parse(jsonArg)

        lastSelected.innerHTML = obj.innerHTML
        Prism.highlightAllUnder(lastSelected)
    }

    
    editArea.addEventListener('keydown', (event)=>{
        if((event.keyCode == 10 || event.keyCode == 13)
            && (event.ctrlKey || event.metaKey)) {
            submitEdit()        
        }
    })

    /**
     * Edit cell.
     * @param {string} content 
     */
    g_handler.startEdit = (content)=> {
        lastSelected.insertAdjacentElement('afterend', editDiv)
        editArea.value = content
        const lineNum = content.split("\n").length
        editArea.rows = Math.max(lineNum, 3);
        editDiv.style.display = 'block'
   }




})