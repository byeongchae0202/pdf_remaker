import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { DocumentAnalysisClient } from '@azure/ai-form-recognizer'
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity'
import { AzureOpenAI } from 'openai'

type SummaryRequest = { language?: string; mode?: string; pages?: Array<{ fileName: string; pageNumber: number }>; pdfBase64?: string }

export async function summarize(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const body = await request.json() as SummaryRequest
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT
  const documentEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
  if (!endpoint || !deployment || !documentEndpoint || !body.pdfBase64) return { status: 503, jsonBody: { error: 'Azure AI services are not configured.' } }
  const documentClient = new DocumentAnalysisClient(documentEndpoint, new DefaultAzureCredential())
  const documentBytes = Buffer.from(body.pdfBase64, 'base64')
  const analysis = await documentClient.beginAnalyzeDocument('prebuilt-read', documentBytes)
  const result = await analysis.pollUntilDone()
  const extractedText = result.content ?? ''
  if (!extractedText.trim()) return { status: 422, jsonBody: { error: 'No readable text was found in the selected pages.' } }
  const credential = new DefaultAzureCredential()
  const azureADTokenProvider = getBearerTokenProvider(credential, 'https://cognitiveservices.azure.com/.default')
  const client = new AzureOpenAI({ endpoint, deployment, apiVersion: '2024-10-21', azureADTokenProvider })
  const pageList = (body.pages ?? []).map((page) => `${page.fileName} p.${page.pageNumber}`).join(', ')
  const response = await client.chat.completions.create({
    model: deployment,
    messages: [
      { role: 'system', content: `Summarize the selected PDF pages in ${body.language ?? 'Korean'}. The requested format is ${body.mode ?? 'combined summary'}. Do not invent content.` },
      { role: 'user', content: `Selected pages: ${pageList}. OCR text:\n${extractedText.slice(0, 12000)}` },
    ],
    temperature: 0.2,
    max_tokens: 700,
  })
  context.log(`Summary generated for ${body.pages?.length ?? 0} pages`)
  return { jsonBody: { summary: response.choices[0]?.message?.content ?? '' } }
}

app.http('summarize', { methods: ['POST'], authLevel: 'anonymous', route: 'summarize', handler: summarize })