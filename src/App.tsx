import { useState, type ChangeEvent } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

type PageItem = {
  id: string
  fileName: string
  file: File
  pageNumber: number
  rotation: number
  previewUrl: string
  encrypted: boolean
  password?: string
}

const languages = ['한국어', 'English', '日本語', '简体中文']
const translations = {
  한국어: { upload: 'PDF를 올려주세요', select: '페이지를 선택하세요', order: '순서를 다듬으세요', summary: 'AI 요약', optional: '선택사항', create: 'PDF 만들기', selected: 'selected', emptyPages: '업로드한 PDF의 페이지가 여기에 표시됩니다.', emptySelection: '선택한 페이지가 이곳에 순서대로 쌓입니다.', choose: '선택', summaryRequest: '요약 요청 ↗', preview: '완성된 PDF 미리보기', download: '다운로드 ↗', language: '화면 언어', intro: '여러 PDF를 한곳에 올리고, 페이지를 골라 나만의 한 파일로 다시 엮어보세요.', summaryModes: ['통합 요약', 'PDF별 요약', '페이지별 요약'] },
  English: { upload: 'Upload your PDFs', select: 'Select your pages', order: 'Arrange your selection', summary: 'AI summary', optional: 'Optional', create: 'Create PDF', selected: 'selected', emptyPages: 'Pages from your uploaded PDFs will appear here.', emptySelection: 'Selected pages will stack here in order.', choose: 'Select', summaryRequest: 'Request summary ↗', preview: 'Finished PDF preview', download: 'Download ↗', language: 'Display language', intro: 'Bring your PDFs together, choose the pages you need, and make one file in your own order.', summaryModes: ['Combined summary', 'Summary by PDF', 'Summary by page'] },
  日本語: { upload: 'PDFをアップロード', select: 'ページを選択', order: '順番を整える', summary: 'AI要約', optional: '任意', create: 'PDFを作成', selected: 'selected', emptyPages: 'アップロードしたPDFのページがここに表示されます。', emptySelection: '選択したページが順番に表示されます。', choose: '選択', summaryRequest: '要約を依頼 ↗', preview: '完成したPDFのプレビュー', download: 'ダウンロード ↗', language: '表示言語', intro: 'PDFをまとめ、必要なページを選び、好きな順番で一つのファイルにします。', summaryModes: ['統合要約', 'PDF別要約', 'ページ別要約'] },
  简体中文: { upload: '上传 PDF', select: '选择页面', order: '调整顺序', summary: 'AI 摘要', optional: '可选', create: '创建 PDF', selected: 'selected', emptyPages: '上传的 PDF 页面会显示在这里。', emptySelection: '选中的页面会按顺序显示在这里。', choose: '选择', summaryRequest: '请求摘要 ↗', preview: '生成的 PDF 预览', download: '下载 ↗', language: '界面语言', intro: '上传 PDF，选择需要的页面，并按自己的顺序合并为一个文件。', summaryModes: ['综合摘要', '按 PDF 摘要', '按页面摘要'] },
} as const

function App() {
  const [pages, setPages] = useState<PageItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [language, setLanguage] = useState('한국어')
  const [summaryLanguage, setSummaryLanguage] = useState('한국어')
  const [summaryMode, setSummaryMode] = useState('통합 요약')
  const [summary, setSummary] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [pageQuery, setPageQuery] = useState('')
  const [draggedId, setDraggedId] = useState('')
  const [notice, setNotice] = useState('PDF를 올리면 페이지를 골라 바로 재구성할 수 있습니다.')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiConsent, setAiConsent] = useState(false)
  const [passwordFile, setPasswordFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')

  const selectedPages = pages.filter((page) => selectedIds.includes(page.id))
  const copy = translations[language as keyof typeof translations]

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type === 'application/pdf')
    if (!files.length) return

    const imported: PageItem[] = []
    for (const file of files) {
      let pdfDocument: PDFDocument | null = null
      let encrypted = false
      try {
        pdfDocument = await PDFDocument.load(await file.arrayBuffer())
      } catch {
        encrypted = true
        setPasswordFile(file)
        setNotice(`${file.name}은(는) 암호화되어 있습니다. 파일 비밀번호를 입력해 주세요.`)
        continue
      }
      const previewDocument = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
      pdfDocument.getPages().forEach((_, index) => {
        void previewDocument.getPage(index + 1).then(async (pdfPage) => {
          const viewport = pdfPage.getViewport({ scale: 0.35 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
          const previewUrl = canvas.toDataURL('image/jpeg', 0.8)
          setPages((current) => current.map((item) => item.file === file && item.pageNumber === index + 1 ? { ...item, previewUrl } : item))
        })
        imported.push({
          id: `${file.name}-${index}-${crypto.randomUUID()}`,
          fileName: file.name,
          file,
          pageNumber: index + 1,
          rotation: 0,
          previewUrl: '',
          encrypted,
        })
      })
    }
    setPages((current) => [...current, ...imported])
    setNotice(`${files.length}개 PDF에서 ${imported.length}개 페이지를 불러왔습니다.`)
    event.target.value = ''
  }

  async function unlockFile() {
    if (!passwordFile || !password) return
    try {
      const previewDocument = await pdfjsLib.getDocument({ data: await passwordFile.arrayBuffer(), password }).promise
      const imported: PageItem[] = Array.from({ length: previewDocument.numPages }, (_, index) => ({
        id: `${passwordFile.name}-${index}-${crypto.randomUUID()}`,
        fileName: passwordFile.name,
        file: passwordFile,
        pageNumber: index + 1,
        rotation: 0,
        previewUrl: '',
        encrypted: true,
        password,
      }))
      setPages((current) => [...current, ...imported])
      imported.forEach((item) => void renderPreview(passwordFile, item.pageNumber, password))
      setNotice(`${passwordFile.name}의 암호를 확인했습니다.`)
      setPasswordFile(null)
      setPassword('')
    } catch {
      setNotice('비밀번호가 올바르지 않습니다. 다시 입력해 주세요.')
    }
  }

  async function renderPreview(file: File, pageNumber: number, filePassword?: string) {
    const previewDocument = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), password: filePassword }).promise
    const pdfPage = await previewDocument.getPage(pageNumber)
    const viewport = pdfPage.getViewport({ scale: 0.35 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    const previewUrl = canvas.toDataURL('image/jpeg', 0.8)
    setPages((current) => current.map((item) => item.file === file && item.pageNumber === pageNumber ? { ...item, previewUrl } : item))
  }

  function togglePage(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function movePage(id: string, direction: -1 | 1) {
    setSelectedIds((current) => {
      const index = current.indexOf(id)
      const next = index + direction
      if (index < 0 || next < 0 || next >= current.length) return current
      const reordered = [...current]
      ;[reordered[index], reordered[next]] = [reordered[next], reordered[index]]
      return reordered
    })
  }

  function selectPageNumbers() {
    const numbers = pageQuery.split(',').flatMap((part) => {
      const [start, end = start] = part.trim().split('-').map(Number)
      return Number.isFinite(start) && Number.isFinite(end) ? Array.from({ length: end - start + 1 }, (_, index) => start + index) : []
    })
    const matches = pages.filter((page) => numbers.includes(page.pageNumber)).map((page) => page.id)
    setSelectedIds((current) => [...new Set([...current, ...matches])])
    setPageQuery('')
  }

  function dropPage(targetId: string) {
    if (!draggedId || draggedId === targetId) return
    setSelectedIds((current) => {
      const sourceIndex = current.indexOf(draggedId)
      const targetIndex = current.indexOf(targetId)
      if (sourceIndex < 0 || targetIndex < 0) return current
      const reordered = [...current]
      reordered.splice(sourceIndex, 1)
      reordered.splice(targetIndex, 0, draggedId)
      return reordered
    })
    setDraggedId('')
  }

  function rotatePage(id: string) {
    setPages((current) => current.map((page) => page.id === id ? { ...page, rotation: (page.rotation + 90) % 360 } : page))
  }

  async function generatePdf() {
    if (!selectedPages.length) {
      setNotice('먼저 PDF 페이지를 하나 이상 선택해 주세요.')
      return
    }
    setIsGenerating(true)
    try {
      const output = await PDFDocument.create()
      const buffers = new Map<File, ArrayBuffer>()
      for (const item of selectedPages) {
        if (item.encrypted) {
          const previewDocument = await pdfjsLib.getDocument({ data: await item.file.arrayBuffer(), password: item.password }).promise
          const pdfPage = await previewDocument.getPage(item.pageNumber)
          const viewport = pdfPage.getViewport({ scale: 1.5 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
          const image = await output.embedJpg(canvas.toDataURL('image/jpeg', 0.92))
          const outputPage = output.addPage([viewport.width / 1.5, viewport.height / 1.5])
          outputPage.drawImage(image, { x: 0, y: 0, width: outputPage.getWidth(), height: outputPage.getHeight(), rotate: degrees(item.rotation) })
          continue
        }
        if (!buffers.has(item.file)) buffers.set(item.file, await item.file.arrayBuffer())
        const source = await PDFDocument.load(buffers.get(item.file)!)
        const [copied] = await output.copyPages(source, [item.pageNumber - 1])
        copied.setRotation(degrees(item.rotation))
        output.addPage(copied)
      }
      const blob = new Blob([await output.save()], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setResultUrl((current) => { if (current) URL.revokeObjectURL(current); return url })
      setNotice(`${selectedPages.length}개 페이지로 PDF를 생성했습니다.`)
    } catch {
      setNotice('PDF를 생성하지 못했습니다. 암호화된 파일의 비밀번호를 확인해 주세요.')
    } finally {
      setIsGenerating(false)
    }
  }

  function downloadResult() {
    if (!resultUrl) return
    const anchor = document.createElement('a')
    anchor.href = resultUrl
    anchor.download = 'repage-selection.pdf'
    anchor.click()
  }

  async function requestSummary() {
    if (!selectedPages.length) {
      setNotice('요약할 페이지를 먼저 선택해 주세요.')
      return
    }
    if (!aiConsent) {
      setNotice('OCR 및 AI 처리를 시작하려면 데이터 처리 동의가 필요합니다.')
      return
    }
    setSummary('요약을 준비하고 있습니다...')
    try {
      const summaryDocument = await PDFDocument.create()
      const buffers = new Map<File, ArrayBuffer>()
      for (const item of selectedPages) {
        if (item.encrypted) {
          const previewDocument = await pdfjsLib.getDocument({ data: await item.file.arrayBuffer(), password: item.password }).promise
          const pdfPage = await previewDocument.getPage(item.pageNumber)
          const viewport = pdfPage.getViewport({ scale: 1.5 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
          const image = await summaryDocument.embedJpg(canvas.toDataURL('image/jpeg', 0.92))
          const summaryPage = summaryDocument.addPage([viewport.width / 1.5, viewport.height / 1.5])
          summaryPage.drawImage(image, { x: 0, y: 0, width: summaryPage.getWidth(), height: summaryPage.getHeight() })
          continue
        }
        if (!buffers.has(item.file)) buffers.set(item.file, await item.file.arrayBuffer())
        const source = await PDFDocument.load(buffers.get(item.file)!)
        const [copied] = await summaryDocument.copyPages(source, [item.pageNumber - 1])
        copied.setRotation(degrees(item.rotation))
        summaryDocument.addPage(copied)
      }
      const pdfBase64 = uint8ArrayToBase64(await summaryDocument.save())
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: summaryLanguage, mode: summaryMode, pdfBase64, pages: selectedPages.map(({ fileName, pageNumber }) => ({ fileName, pageNumber })) }),
      })
      if (!response.ok) throw new Error('summary unavailable')
      const result = await response.json() as { summary: string }
      setSummary(result.summary)
    } catch {
      setSummary('Azure AI 설정 후 선택한 언어와 방식으로 요약을 표시할 수 있습니다. PDF 생성은 계속 사용할 수 있습니다.')
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">re<span>page</span></a>
        <div className="topbar-actions">
          <label className="language-label" htmlFor="language">{copy.language}</label>
          <select id="language" value={language} onChange={(event) => setLanguage(event.target.value)}>
            {languages.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">PDF PAGE REMIXER / 01</p>
          <h1>필요한 페이지만,<br /><em>새로운 순서로.</em></h1>
          <p className="intro">{copy.intro}</p>
        </div>
        <div className="hero-mark" aria-hidden="true"><span>+</span><span>↗</span><span>□</span></div>
      </section>

      <section className="workspace">
        <div className="upload-panel">
          <div className="section-heading"><span className="step">01</span><h2>{copy.upload}</h2></div>
          <label className="dropzone">
            <input type="file" accept="application/pdf" multiple onChange={handleFiles} />
            <span className="upload-icon">↑</span>
            <strong>PDF 파일을 드래그하거나 클릭</strong>
            <small>여러 파일을 한 번에 선택할 수 있어요</small>
          </label>
          <p className="notice">{notice}</p>
        </div>

        <div className="pages-panel">
          <div className="section-heading"><span className="step">02</span><h2>{copy.select}</h2><div className="page-query"><input value={pageQuery} onChange={(event) => setPageQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') selectPageNumbers() }} placeholder="예: 1-3, 7" aria-label="페이지 번호 선택" /><button onClick={selectPageNumbers}>{copy.choose}</button></div><span className="count">{selectedPages.length} {copy.selected}</span></div>
          {!pages.length ? <div className="empty-state">{copy.emptyPages}</div> : <div className="page-grid">
            {pages.map((page, index) => <button className={`page-card ${selectedIds.includes(page.id) ? 'selected' : ''}`} key={page.id} onClick={() => togglePage(page.id)}>
              <span className="page-number">{String(index + 1).padStart(2, '0')}</span>
              <div className="page-sheet">{page.previewUrl ? <img src={page.previewUrl} alt={`${page.fileName} ${page.pageNumber}페이지 미리보기`} /> : <><span>{page.fileName.slice(0, 18)}</span><i>{page.pageNumber}</i><b /></>}</div>
              <span className="page-caption">{page.fileName} · p.{page.pageNumber}</span>
            </button>)}
          </div>}
        </div>

        <div className="selection-panel">
          <div className="section-heading"><span className="step">03</span><h2>{copy.order}</h2></div>
          {!selectedPages.length ? <div className="empty-state compact">{copy.emptySelection}</div> : <div className="selection-list">
            {selectedPages.map((page, index) => <div className="selection-row" key={page.id} draggable onDragStart={() => setDraggedId(page.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropPage(page.id)}>
              <span className="order">{String(index + 1).padStart(2, '0')}</span><span className="row-name">{page.fileName} · p.{page.pageNumber}</span>
              <button title="왼쪽으로 이동" onClick={() => movePage(page.id, -1)}>←</button><button title="오른쪽으로 이동" onClick={() => movePage(page.id, 1)}>→</button><button title="페이지 90도 회전" onClick={() => rotatePage(page.id)}>↻</button>
            </div>)}
          </div>}
        </div>
      </section>

      <section className="bottom-grid">
        <div className="summary-panel">
          <div className="section-heading"><span className="step">04</span><h2>{copy.summary} <small>{copy.optional}</small></h2></div>
          <div className="controls-row"><select value={summaryMode} onChange={(event) => setSummaryMode(event.target.value)}>{copy.summaryModes.map((item) => <option key={item}>{item}</option>)}</select><select value={summaryLanguage} onChange={(event) => setSummaryLanguage(event.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select><button className="text-button" onClick={requestSummary}>{copy.summaryRequest}</button></div>
          {summary && <div className="summary-result">{summary}</div>}
          <label className="consent-row"><input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} /> AI 요약과 OCR을 사용하면 문서가 Azure AI로 임시 전송됩니다. 데이터 처리에 동의합니다.</label>
        </div>
        <div className="generate-panel"><p>선택한 페이지</p><strong>{selectedPages.length}<small> pages</small></strong><button className="generate-button" onClick={generatePdf} disabled={isGenerating}>{isGenerating ? '생성 중...' : copy.create} <span>↗</span></button></div>
      </section>
      {resultUrl && <section className="result-panel"><div className="section-heading"><span className="step">05</span><h2>{copy.preview}</h2><button className="text-button" onClick={downloadResult}>{copy.download}</button></div><iframe title={copy.preview} src={resultUrl} /></section>}
      {passwordFile && <div className="modal-backdrop"><div className="password-dialog"><p className="eyebrow">ENCRYPTED PDF</p><h2>파일 비밀번호</h2><p>{passwordFile.name}의 페이지를 확인하려면 비밀번호가 필요합니다.</p><input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void unlockFile() }} /><div><button className="text-button" onClick={() => { setPasswordFile(null); setPassword('') }}>취소</button><button className="generate-button" onClick={() => void unlockFile()}>확인</button></div></div></div>}
    </main>
  )
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  return btoa(binary)
}

export default App