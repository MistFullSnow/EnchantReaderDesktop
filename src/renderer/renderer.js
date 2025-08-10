import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const openBtn = document.getElementById('openBtn')
const toc = document.getElementById('toc')
const content = document.getElementById('content')
const welcome = document.getElementById('welcome')

// Animated background
const bg = document.getElementById('bg')
const ctx = bg.getContext('2d')
function resize(){bg.width=window.innerWidth;bg.height=window.innerHeight}
window.addEventListener('resize',resize);resize()
const particles = Array.from({length:80}).map(()=>({x:Math.random()*bg.width,y:Math.random()*bg.height,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,r:Math.random()*2+1,c:`hsl(${Math.random()*360},70%,70%)`}))
;(function tick(){ctx.clearRect(0,0,bg.width,bg.height);particles.forEach(p=>{p.x=(p.x+p.vx+bg.width)%bg.width;p.y=(p.y+p.vy+bg.height)%bg.height;ctx.beginPath();ctx.fillStyle=p.c;ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()});requestAnimationFrame(tick)})()

openBtn.addEventListener('click', async ()=>{
  const filePath = await window.EnchantAPI.openPdf()
  if (!filePath) return
  loadPdf(filePath)
})

async function loadPdf(filePath){
  welcome?.remove()
  toc.innerHTML = ''
  content.innerHTML = ''

  const loadingTask = pdfjsLib.getDocument({ url: `file://${filePath}` })
  const pdf = await loadingTask.promise

  // Try extract text
  const textByPage = []
  for (let i=1;i<=Math.min(pdf.numPages, 40);i++){ // limit for speed
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map(it=>('str' in it? it.str : '')).join(' ')
    textByPage.push(strings)
  }
  const joined = textByPage.join('\n')
  const hasText = joined.trim().length > 200

  if (hasText){
    // Build pseudo Acts/Scenes by simple chunking
    const chunks = chunkText(joined, 2000)
    renderTOC(chunks.map((_,i)=>({title:`Scene ${i+1}`})))
    renderText(chunks)
  } else {
    renderPages(pdf)
  }
}

function chunkText(text, size){
  const parts=[]
  for(let i=0;i<text.length;i+=size){parts.push(text.slice(i,i+size))}
  return parts
}

function renderTOC(items){
  toc.innerHTML = ''
  const title = document.createElement('div')
  title.className='toc-act';title.textContent='Scenes'
  toc.appendChild(title)
  items.forEach((it,idx)=>{
    const el = document.createElement('div')
    el.className='toc-scene'
    el.textContent = it.title
    el.addEventListener('click',()=>{
      const section = document.getElementById(`scene-${idx}`)
      section?.scrollIntoView({behavior:'smooth',block:'start'})
    })
    toc.appendChild(el)
  })
}

function renderText(chunks){
  content.innerHTML=''
  chunks.forEach((txt,i)=>{
    const section = document.createElement('section')
    section.id = `scene-${i}`
    const h = document.createElement('h2')
    h.textContent = `Scene ${i+1}`
    const pre = document.createElement('pre')
    pre.textContent = txt
    section.appendChild(h)
    section.appendChild(pre)
    content.appendChild(section)
  })
}

async function renderPages(pdf){
  content.innerHTML = ''
  for(let i=1;i<=pdf.numPages;i++){
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: ctx, viewport }).promise
    content.appendChild(canvas)
  }
}
