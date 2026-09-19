import { useState, type ChangeEvent } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

function SortablePageRow({ page, index, onRotate, onPreview, previewLabel }: { page: PageItem; index: number; onRotate: (id: string) => void; onPreview: (page: PageItem) => void; previewLabel: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return <div className={`selection-row ${isDragging ? 'dragging' : ''}`} ref={setNodeRef} style={style}>
    <button className="drag-handle" type="button" title="드래그해서 순서 변경" aria-label="드래그해서 순서 변경" {...attributes} {...listeners}><span>⠿</span></button>
    <span className="order">{String(index + 1).padStart(2, '0')}</span><span className="row-name">{page.fileName} · p.{page.pageNumber}</span>
    <span className="row-actions"><button title="페이지 90도 회전" onClick={() => onRotate(page.id)}>↻</button><button className="preview-page-button" title={previewLabel} onClick={() => onPreview(page)}>{previewLabel}</button></span>
  </div>
}

const languages = ['한국어', 'English', '日本語', '简体中文', '繁體中文']
const translations = {
  한국어: { upload: 'PDF를 올려주세요', select: '페이지를 선택하세요', order: '순서를 다듬으세요', summary: 'AI 요약', optional: '선택사항', create: 'PDF 만들기', selected: '선택됨', emptyPages: '업로드한 PDF의 페이지가 여기에 표시됩니다.', emptySelection: '선택한 페이지가 이곳에 순서대로 쌓입니다.', choose: '선택', summaryRequest: '요약 요청 ↗', preview: '완성된 PDF 미리보기', pagePreview: '페이지 미리보기', close: '닫기', download: '다운로드 ↗', language: '화면 언어', intro: '여러 PDF를 한곳에 올리고, 페이지를 골라 나만의 한 파일로 다시 엮어보세요.', summaryModes: ['통합 요약', 'PDF별 요약', '페이지별 요약'], uploadHint: '여러 파일을 한 번에 선택할 수 있어요', pagePlaceholder: '예: 1-3, 7', selectedPages: '선택한 페이지', pages: '페이지', creating: '생성 중...', privacy: 'AI 요약과 OCR을 사용하면 문서가 Azure AI로 임시 전송됩니다. 데이터 처리에 동의합니다.', encryptedTitle: '파일 비밀번호', encryptedHint: '페이지를 확인하려면 비밀번호가 필요합니다.', cancel: '취소', confirm: '확인', dragHint: 'PDF 파일을 드래그하거나 클릭' },
  English: { upload: 'Upload your PDFs', select: 'Select your pages', order: 'Arrange your selection', summary: 'AI summary', optional: 'Optional', create: 'Create PDF', selected: 'selected', emptyPages: 'Pages from your uploaded PDFs will appear here.', emptySelection: 'Selected pages will stack here in order.', choose: 'Select', summaryRequest: 'Request summary ↗', preview: 'Finished PDF preview', pagePreview: 'Page preview', close: 'Close', download: 'Download ↗', language: 'Display language', intro: 'Bring your PDFs together, choose the pages you need, and make one file in your own order.', summaryModes: ['Combined summary', 'Summary by PDF', 'Summary by page'], uploadHint: 'Choose multiple files at once', pagePlaceholder: 'e.g. 1-3, 7', selectedPages: 'Selected pages', pages: 'pages', creating: 'Creating...', privacy: 'Using AI summary and OCR temporarily sends your document to Azure AI. I consent to data processing.', encryptedTitle: 'File password', encryptedHint: 'A password is required to view these pages.', cancel: 'Cancel', confirm: 'Confirm', dragHint: 'Drag or click to add PDF files' },
  日本語: { upload: 'PDFをアップロード', select: 'ページを選択', order: '順番を整える', summary: 'AI要約', optional: '任意', create: 'PDFを作成', selected: '選択済み', emptyPages: 'アップロードしたPDFのページがここに表示されます。', emptySelection: '選択したページが順番に表示されます。', choose: '選択', summaryRequest: '要約を依頼 ↗', preview: '完成したPDFのプレビュー', pagePreview: 'ページプレビュー', close: '閉じる', download: 'ダウンロード ↗', language: '表示言語', intro: 'PDFをまとめ、必要なページを選び、好きな順番で一つのファイルにします。', summaryModes: ['統合要約', 'PDF別要約', 'ページ別要約'], uploadHint: '複数のファイルを一度に選択できます', pagePlaceholder: '例: 1-3, 7', selectedPages: '選択したページ', pages: 'ページ', creating: '作成中...', privacy: 'AI要約とOCRでは文書がAzure AIに一時送信されます。データ処理に同意します。', encryptedTitle: 'ファイルのパスワード', encryptedHint: 'ページを表示するにはパスワードが必要です。', cancel: 'キャンセル', confirm: '確認', dragHint: 'PDFをドラッグまたはクリック' },
  简体中文: { upload: '上传 PDF', select: '选择页面', order: '调整顺序', summary: 'AI 摘要', optional: '可选', create: '创建 PDF', selected: '已选择', emptyPages: '上传的 PDF 页面会显示在这里。', emptySelection: '选中的页面会按顺序显示在这里。', choose: '选择', summaryRequest: '请求摘要 ↗', preview: '生成的 PDF 预览', pagePreview: '页面预览', close: '关闭', download: '下载 ↗', language: '界面语言', intro: '上传 PDF，选择需要的页面，并按自己的顺序合并为一个文件。', summaryModes: ['综合摘要', '按 PDF 摘要', '按页面摘要'], uploadHint: '可以一次选择多个文件', pagePlaceholder: '例如：1-3, 7', selectedPages: '已选页面', pages: '页', creating: '创建中...', privacy: '使用 AI 摘要和 OCR 时，文档会临时发送到 Azure AI。我同意数据处理。', encryptedTitle: '文件密码', encryptedHint: '查看页面需要输入密码。', cancel: '取消', confirm: '确认', dragHint: '拖动或点击以添加 PDF' },
  繁體中文: { upload: '上傳 PDF', select: '選擇頁面', order: '調整順序', summary: 'AI 摘要', optional: '選用', create: '建立 PDF', selected: '已選擇', emptyPages: '上傳的 PDF 頁面會顯示在這裡。', emptySelection: '選取的頁面會依序顯示在這裡。', choose: '選擇', summaryRequest: '請求摘要 ↗', preview: '產生的 PDF 預覽', pagePreview: '頁面預覽', close: '關閉', download: '下載 ↗', language: '介面語言', intro: '上傳 PDF，選擇需要的頁面，並依照自己的順序合併成一個檔案。', summaryModes: ['整合摘要', '依 PDF 摘要', '依頁面摘要'], uploadHint: '可以一次選擇多個檔案', pagePlaceholder: '例如：1-3, 7', selectedPages: '已選頁面', pages: '頁', creating: '建立中...', privacy: '使用 AI 摘要和 OCR 時，文件會暫時傳送至 Azure AI。我同意資料處理。', encryptedTitle: '檔案密碼', encryptedHint: '檢視頁面需要輸入密碼。', cancel: '取消', confirm: '確認', dragHint: '拖曳或點擊以新增 PDF' },
} as const

const statusMessages = {
  한국어: { consent: 'OCR 및 AI 처리를 시작하려면 데이터 처리 동의가 필요합니다.', preparing: '요약을 준비하고 있습니다...', unavailable: 'Azure AI 설정 후 선택한 언어와 방식으로 요약을 표시할 수 있습니다. PDF 생성은 계속 사용할 수 있습니다.' },
  English: { consent: 'Consent is required before OCR and AI processing.', preparing: 'Preparing summary...', unavailable: 'Configure Azure AI to show a summary in the selected language and format. PDF creation remains available.' },
  日本語: { consent: 'OCRとAI処理を開始するにはデータ処理への同意が必要です。', preparing: '要約を準備しています...', unavailable: 'Azure AIを設定すると選択した言語と形式で要約できます。PDF作成は引き続き利用できます。' },
  简体中文: { consent: '开始 OCR 和 AI 处理前需要同意数据处理。', preparing: '正在准备摘要...', unavailable: '配置 Azure AI 后即可按所选语言和方式显示摘要。PDF 创建仍可使用。' },
  繁體中文: { consent: '開始 OCR 和 AI 處理前需要同意資料處理。', preparing: '正在準備摘要...', unavailable: '設定 Azure AI 後即可依所選語言和方式顯示摘要。PDF 建立仍可使用。' },
} as const

const heroTitles = {
  한국어: ['필요한 페이지만,', '새로운 순서로.'],
  English: ['Only the pages you need,', 'in a new order.'],
  日本語: ['必要なページだけを、', '新しい順番で。'],
  简体中文: ['只保留需要的页面，', '按全新顺序排列。'],
  繁體中文: ['只保留需要的頁面，', '依全新順序排列。'],
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
  const [notice, setNotice] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [pageToPreview, setPageToPreview] = useState<PageItem | null>(null)
  const [aiConsent, setAiConsent] = useState(false)
  const [passwordFile, setPasswordFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')

  const selectedPages = selectedIds.map((id) => pages.find((page) => page.id === id)).filter((page): page is PageItem => Boolean(page))
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
        setNotice(`${file.name}: ${copy.encryptedHint}`)
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
    setNotice(`${files.length} PDF · ${imported.length} ${copy.pages}`)
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
      setNotice(`${passwordFile.name}: ${copy.confirm}`)
      setPasswordFile(null)
      setPassword('')
    } catch {
      setNotice(copy.encryptedHint)
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

  function selectPageNumbers() {
    const numbers = pageQuery.split(',').flatMap((part) => {
      const [start, end = start] = part.trim().split('-').map(Number)
      return Number.isFinite(start) && Number.isFinite(end) ? Array.from({ length: end - start + 1 }, (_, index) => start + index) : []
    })
    const matches = pages.filter((page) => numbers.includes(page.pageNumber)).map((page) => page.id)
    setSelectedIds((current) => [...new Set([...current, ...matches])])
    setPageQuery('')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSelectedIds((current) => {
      const sourceIndex = current.indexOf(String(active.id))
      const targetIndex = current.indexOf(String(over.id))
      if (sourceIndex < 0 || targetIndex < 0) return current
      const reordered = [...current]
      const [moved] = reordered.splice(sourceIndex, 1)
      reordered.splice(targetIndex, 0, moved)
      return reordered
    })
  }

  function rotatePage(id: string) {
    setPages((current) => current.map((page) => page.id === id ? { ...page, rotation: (page.rotation + 90) % 360 } : page))
  }

  async function generatePdf() {
    if (!selectedPages.length) {
      setNotice(copy.emptySelection)
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
      setNotice(`${selectedPages.length} ${copy.pages}`)
    } catch {
      setNotice(copy.encryptedHint)
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
      setNotice(copy.emptySelection)
      return
    }
    if (!aiConsent) {
      setNotice(statusMessages[language as keyof typeof statusMessages].consent)
      return
    }
    setSummary(statusMessages[language as keyof typeof statusMessages].preparing)
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
      setSummary(statusMessages[language as keyof typeof statusMessages].unavailable)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">re<span>page</span></a>
        <div className="topbar-actions">
          <label className="language-label" htmlFor="language">{copy.language}</label>
          <select id="language" value={language} onChange={(event) => { const nextLanguage = event.target.value as keyof typeof translations; setLanguage(nextLanguage); setSummaryMode(translations[nextLanguage].summaryModes[0]) }}>
            {languages.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">PDF PAGE REMIXER / 01</p>
          <h1>{heroTitles[language as keyof typeof heroTitles][0]}<br /><em>{heroTitles[language as keyof typeof heroTitles][1]}</em></h1>
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
            <strong>{copy.dragHint}</strong>
            <small>{copy.uploadHint}</small>
          </label>
          <p className="notice">{notice}</p>
        </div>

        <div className="pages-panel">
          <div className="section-heading"><span className="step">02</span><h2>{copy.select}</h2><div className="page-query"><input value={pageQuery} onChange={(event) => setPageQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') selectPageNumbers() }} placeholder={copy.pagePlaceholder} aria-label={copy.select} /><button onClick={selectPageNumbers}>{copy.choose}</button></div><span className="count">{selectedPages.length} {copy.selected}</span></div>
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
          {!selectedPages.length ? <div className="empty-state compact">{copy.emptySelection}</div> : <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}><SortableContext items={selectedPages.map((page) => page.id)} strategy={verticalListSortingStrategy}><div className="selection-list">
            {selectedPages.map((page, index) => <SortablePageRow key={page.id} page={page} index={index} onRotate={rotatePage} onPreview={setPageToPreview} previewLabel={copy.pagePreview} />)}
          </div></SortableContext></DndContext>}
        </div>
      </section>

      <section className="bottom-grid">
        <div className="summary-panel">
          <div className="section-heading"><span className="step">04</span><h2>{copy.summary} <small>{copy.optional}</small></h2></div>
          <div className="controls-row"><select value={summaryMode} onChange={(event) => setSummaryMode(event.target.value)}>{copy.summaryModes.map((item) => <option key={item}>{item}</option>)}</select><select value={summaryLanguage} onChange={(event) => setSummaryLanguage(event.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select><button className="text-button" onClick={requestSummary}>{copy.summaryRequest}</button></div>
          {summary && <div className="summary-result">{summary}</div>}
          <label className="consent-row"><input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} /> {copy.privacy}</label>
        </div>
        <div className="generate-panel"><p>{copy.selectedPages}</p><strong>{selectedPages.length}<small> {copy.pages}</small></strong><button className="generate-button" onClick={generatePdf} disabled={isGenerating}>{isGenerating ? copy.creating : copy.create} <span>↗</span></button></div>
      </section>
      {resultUrl && <section className="result-panel"><div className="section-heading"><span className="step">05</span><h2>{copy.preview}</h2><button className="text-button" onClick={downloadResult}>{copy.download}</button></div><iframe title={copy.preview} src={resultUrl} /></section>}
      {pageToPreview && <div className="modal-backdrop" onClick={() => setPageToPreview(null)}><div className="page-preview-dialog" onClick={(event) => event.stopPropagation()}><div className="section-heading"><h2>{copy.pagePreview}</h2><button className="text-button" onClick={() => setPageToPreview(null)}>{copy.close}</button></div>{pageToPreview.previewUrl ? <img src={pageToPreview.previewUrl} alt={`${pageToPreview.fileName} ${pageToPreview.pageNumber}`} style={{ transform: `rotate(${pageToPreview.rotation}deg)` }} /> : <p>{pageToPreview.fileName} · p.{pageToPreview.pageNumber}</p>}</div></div>}
      {passwordFile && <div className="modal-backdrop"><div className="password-dialog"><p className="eyebrow">ENCRYPTED PDF</p><h2>{copy.encryptedTitle}</h2><p>{passwordFile.name}<br />{copy.encryptedHint}</p><input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void unlockFile() }} /><div><button className="text-button" onClick={() => { setPasswordFile(null); setPassword('') }}>{copy.cancel}</button><button className="generate-button" onClick={() => void unlockFile()}>{copy.confirm}</button></div></div></div>}
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