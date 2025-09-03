import { z } from "zod"
import { LanguageModelV2, LanguageModelV2StreamPart, type LanguageModelV2CallOptions, type LanguageModelV2CallWarning, type LanguageModelV2FinishReason, type LanguageModelV2Message, type LanguageModelV2ProviderMetadata } from "@ai-sdk/provider"
import { FetchFunction, combineHeaders, createEventSourceResponseHandler, createJsonResponseHandler, postJsonToApi } from "@ai-sdk/provider-utils"

export type IBMWatsonxConfig = {
  apiKey?: string
  projectId?: string
  baseURL?: string
  headers?: Record<string, string>
  fetch?: FetchFunction
}

export interface IBMWatsonxSettings {
  max_tokens?: number
  temperature?: number
  top_p?: number
  top_k?: number
  repetition_penalty?: number
  stop_sequences?: string[]
  random_seed?: number
}

export function createIBMWatsonx(config: IBMWatsonxConfig = {}) {
  const getConfig = () => {
    const apiKey = config.apiKey ?? process.env.WATSONX_APIKEY ?? process.env.IBM_WATSONX_APIKEY
    const projectId = config.projectId ?? process.env.WATSONX_PROJECT_ID ?? process.env.IBM_WATSONX_PROJECT_ID
    
    if (!apiKey) {
      throw new Error("IBM WatsonX API key is required")
    }
    if (!projectId) {
      throw new Error("IBM WatsonX project ID is required")
    }
    
    return {
      apiKey,
      projectId,
      baseURL: config.baseURL ?? "https://us-south.ml.cloud.ibm.com",
      headers: config.headers ?? {},
      fetch: config.fetch,
    }
  }

  const languageModel = (modelId: string) => 
    new IBMWatsonxLanguageModel(modelId, getConfig)

  return {
    languageModel,
  }
}

class IBMWatsonxLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = "v2"
  readonly provider = "ibm-watsonx"
  readonly modelId: string
  readonly maxEmbeddingVectorDimensions = undefined

  private readonly config: () => { apiKey: string; projectId: string; baseURL: string; headers: Record<string, string>; fetch?: FetchFunction }

  constructor(modelId: string, config: () => { apiKey: string; projectId: string; baseURL: string; headers: Record<string, string>; fetch?: FetchFunction }) {
    this.modelId = modelId
    this.config = config
  }

  get defaultObjectGenerationMode() {
    return undefined
  }

  private async getAccessToken(): Promise<string> {
    const { apiKey, fetch } = this.config()
    
    const response = await (fetch ?? globalThis.fetch)("https://iam.cloud.ibm.com/identity/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "urn:iam:params:oauth:grant-type:apikey",
        apikey: apiKey,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`)
    }

    const data = await response.json()
    return data.access_token
  }

  async doGenerate(options: LanguageModelV2CallOptions): Promise<{
    text?: string
    toolCalls?: Array<{
      toolCallType: "function"
      toolCallId: string
      toolName: string
      args: unknown
    }>
    finishReason: LanguageModelV2FinishReason
    usage: {
      promptTokens: number
      completionTokens: number
    }
    rawCall: {
      rawPrompt: unknown
      rawSettings: Record<string, unknown>
    }
    rawResponse?: {
      headers?: Record<string, string>
    }
    warnings?: LanguageModelV2CallWarning[]
    providerMetadata?: LanguageModelV2ProviderMetadata
  }> {
    const { projectId, baseURL, fetch } = this.config()
    const accessToken = await this.getAccessToken()

    const prompt = this.convertMessagesToPrompt(options.messages)
    
    const body = {
      model_id: this.modelId,
      input: prompt,
      parameters: {
        max_new_tokens: options.maxTokens ?? 1000,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 1,
        repetition_penalty: 1,
        decoding_method: "greedy",
        stop_sequences: options.stopSequences ?? [],
      },
      project_id: projectId,
    }

    const response = await postJsonToApi({
      url: `${baseURL}/ml/v1/text/generation?version=2023-05-29`,
      headers: combineHeaders(
        {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        {},
      ),
      body,
      failedResponseHandler: createJsonResponseHandler({
        errorSchema: z.object({
          error: z.object({
            message: z.string(),
          }),
        }),
        errorToMessage: (data: { error: { message: string } }) => data.error.message,
      }),
      successfulResponseHandler: createJsonResponseHandler({
        schema: z.object({
          results: z.array(
            z.object({
              generated_text: z.string(),
              generated_token_count: z.number().optional(),
              input_token_count: z.number().optional(),
              stop_reason: z.string().optional(),
            })
          ),
        }),
      }),
      abortSignal: options.abortSignal,
      fetch,
    })

    const result = response.value.results[0]

    return {
      text: result.generated_text,
      finishReason: this.mapFinishReason(result.stop_reason),
      usage: {
        promptTokens: result.input_token_count ?? 0,
        completionTokens: result.generated_token_count ?? 0,
      },
      rawCall: {
        rawPrompt: prompt,
        rawSettings: body.parameters,
      },
    }
  }

  async doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>
    rawCall: {
      rawPrompt: unknown
      rawSettings: Record<string, unknown>
    }
    rawResponse?: {
      headers?: Record<string, string>
    }
    warnings?: LanguageModelV2CallWarning[]
  }> {
    const { projectId, baseURL, fetch } = this.config()
    const accessToken = await this.getAccessToken()

    const prompt = this.convertMessagesToPrompt(options.messages)
    
    const body = {
      model_id: this.modelId,
      input: prompt,
      parameters: {
        max_new_tokens: options.maxTokens ?? 1000,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 1,
        repetition_penalty: 1,
        decoding_method: "greedy",
        stop_sequences: options.stopSequences ?? [],
      },
      project_id: projectId,
    }

    const response = await postJsonToApi({
      url: `${baseURL}/ml/v1/text/generation_stream?version=2023-05-29`,
      headers: combineHeaders(
        {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        {},
      ),
      body,
      failedResponseHandler: createJsonResponseHandler({
        errorSchema: z.object({
          error: z.object({
            message: z.string(),
          }),
        }),
        errorToMessage: (data: { error: { message: string } }) => data.error.message,
      }),
      successfulResponseHandler: createEventSourceResponseHandler({
        schema: z.object({
          results: z.array(
            z.object({
              generated_text: z.string(),
              generated_token_count: z.number().optional(),
              input_token_count: z.number().optional(),
              stop_reason: z.string().optional(),
            })
          ),
        }),
      }),
      abortSignal: options.abortSignal,
      fetch,
    })

    let finishReason: LanguageModelV2FinishReason = "other"
    let usage = { promptTokens: 0, completionTokens: 0 }

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        const reader = response.value.getReader()
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              controller.enqueue({
                type: "finish",
                finishReason,
                usage,
              })
              controller.close()
              break
            }

            if (value.results && value.results[0]) {
              const result = value.results[0]
              
              if (result.generated_text) {
                controller.enqueue({
                  type: "text-delta",
                  textDelta: result.generated_text,
                })
              }

              if (result.stop_reason) {
                finishReason = this.mapFinishReason(result.stop_reason)
              }

              if (result.input_token_count !== undefined || result.generated_token_count !== undefined) {
                usage = {
                  promptTokens: result.input_token_count ?? usage.promptTokens,
                  completionTokens: result.generated_token_count ?? usage.completionTokens,
                }
              }
            }
          }
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return {
      stream,
      rawCall: {
        rawPrompt: prompt,
        rawSettings: body.parameters,
      },
    }
  }

  private convertMessagesToPrompt(messages: LanguageModelV2Message[]): string {
    return messages
      .map((message) => {
        switch (message.role) {
          case "system":
            return `System: ${message.content}`
          case "user":
            return `Human: ${message.content}`
          case "assistant":
            return `Assistant: ${message.content}`
          default:
            return `${message.role}: ${message.content}`
        }
      })
      .join("\n\n")
  }

  private mapFinishReason(reason?: string): LanguageModelV2FinishReason {
    switch (reason) {
      case "eos_token":
      case "stop_sequence":
        return "stop"
      case "max_tokens":
        return "length"
      default:
        return "other"
    }
  }
}