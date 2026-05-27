/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  BookOpen,
  Check,
  Copy,
  Gift,
  KeyRound,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { createApiKey, fetchTokenKey, getApiKeys } from '@/features/keys/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/_authenticated/chatbox-ai')({
  component: ChatboxAIPage,
})

type TopUpResponse = {
  success: boolean
  message?: string
  data?: number
}

const API_BASE_URL = 'https://a123.ai/v1'

function maskCode(code: string) {
  const cleaned = code.trim()
  if (cleaned.length <= 8) return cleaned
  return `${cleaned.slice(0, 6)}...${cleaned.slice(-4)}`
}

function stepCard(index: number, title: string, desc: React.ReactNode) {
  return (
    <div className='bg-card/80 border-border/60 flex gap-4 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'>
      <div className='bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm'>
        {index}
      </div>
      <div className='space-y-1'>
        <div className='text-foreground font-semibold'>{title}</div>
        <div className='text-muted-foreground text-sm leading-6'>{desc}</div>
      </div>
    </div>
  )
}

function ChatboxAIPage() {
  const [code, setCode] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [copied, setCopied] = useState(false)

  const normalizedCode = useMemo(() => code.trim(), [code])

  const copyText = async (text: string, message = '已复制') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(message)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const handleRedeem = async () => {
    if (!normalizedCode) {
      toast.error('请输入兑换码')
      return
    }

    setRedeeming(true)
    setApiKey('')
    try {
      const topupRes = await api.post<TopUpResponse>('/api/user/self/topup', {
        key: normalizedCode,
      })
      if (!topupRes.data?.success) {
        toast.error(topupRes.data?.message || '兑换失败，请检查兑换码')
        return
      }

      const tokenName = `Chatbox AI-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')}-${maskCode(normalizedCode)}`

      const createRes = await createApiKey({
        name: tokenName,
        remain_quota: 0,
        expired_time: -1,
        unlimited_quota: true,
        model_limits_enabled: false,
        model_limits: '',
        allow_ips: '',
        group: 'default',
        cross_group_retry: true,
      })

      if (!createRes.success) {
        toast.error(createRes.message || '兑换成功，但 API Key 创建失败')
        return
      }

      const listRes = await getApiKeys({ p: 1, size: 20 })
      const createdToken = listRes.data?.items?.find((item) => item.name === tokenName)
      if (!createdToken) {
        toast.success('兑换成功，API Key 已创建，请到“API 密钥”页面查看')
        return
      }

      const keyRes = await fetchTokenKey(createdToken.id)
      if (!keyRes.success || !keyRes.data?.key) {
        toast.success('兑换成功，API Key 已创建，请到“API 密钥”页面查看')
        return
      }

      setApiKey(keyRes.data.key)
      toast.success('兑换成功，API Key 已生成')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '兑换失败，请稍后重试')
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8'>
      <div className='relative overflow-hidden rounded-[30px] bg-gradient-to-r from-yellow-300 via-orange-500 to-rose-500 p-[2px] shadow-[0_24px_70px_rgba(244,63,94,0.38)]'>
        <div className='relative overflow-hidden rounded-[28px] bg-[#090909] px-6 py-7 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] md:px-8'>
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(250,204,21,0.42),transparent_30%),radial-gradient(circle_at_88%_15%,rgba(244,63,94,0.36),transparent_34%),radial-gradient(circle_at_50%_105%,rgba(147,51,234,0.34),transparent_36%)]' />
          <div className='pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-yellow-400/30 blur-3xl' />
          <div className='pointer-events-none absolute -right-20 -bottom-20 h-44 w-44 rounded-full bg-rose-500/35 blur-3xl' />
          <div className='pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-yellow-200/80 to-transparent' />
          <div className='relative flex flex-col gap-4'>
            <span className='inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 px-4 py-1.5 text-xs font-black tracking-[0.18em] text-white shadow-[0_0_28px_rgba(249,115,22,0.55)] ring-1 ring-white/20'>
              <Gift className='h-4 w-4' /> Chatbox AI
            </span>
            <div>
              <h1 className='bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-3xl leading-tight font-black text-transparent drop-shadow-[0_0_18px_rgba(251,146,60,0.45)] sm:text-4xl'>
                Chatbox AI
              </h1>
              <p className='mt-2 text-sm font-semibold text-white/90 sm:text-base'>
                兑换 API 密钥并查看完整使用教程
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue='redeem' className='gap-5'>
        <TabsList variant='line' className='border-b pb-2'>
          <TabsTrigger value='redeem' className='gap-2 px-3'>
            <Gift className='h-4 w-4' />
            兑换码
          </TabsTrigger>
          <TabsTrigger value='tutorial' className='gap-2 px-3'>
            <BookOpen className='h-4 w-4' />
            使用教程
          </TabsTrigger>
        </TabsList>

        <TabsContent value='redeem' className='outline-none'>
          <div className='grid gap-5 lg:grid-cols-[1.1fr_0.9fr]'>
            <Card className='overflow-hidden'>
              <CardContent className='space-y-5 p-5 sm:p-6'>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2 text-lg font-semibold'>
                    <Sparkles className='h-5 w-5 text-blue-600' />
                    输入兑换码直接获取 API Key
                  </div>
                  <p className='text-muted-foreground text-sm leading-6'>
                    兑换成功后，系统会自动为你创建一个 Chatbox AI 专用 API Key。
                    请及时复制保存，之后也可以在“API 密钥”页面查看。
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='chatbox-code'>兑换码</Label>
                  <div className='flex flex-col gap-2 sm:flex-row'>
                    <Input
                      id='chatbox-code'
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleRedeem()
                      }}
                      placeholder='请输入兑换码，例如 CBAI-XXXX-XXXX-XXXX'
                      className='h-11 flex-1 text-base'
                    />
                    <Button
                      onClick={handleRedeem}
                      disabled={redeeming}
                      className='h-11 min-w-28 bg-blue-600 text-white hover:bg-blue-700'
                    >
                      {redeeming ? (
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      ) : (
                        <Gift className='mr-2 h-4 w-4' />
                      )}
                      立即兑换
                    </Button>
                  </div>
                </div>

                {apiKey && (
                  <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30'>
                    <div className='mb-3 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300'>
                      <Check className='h-5 w-5' />
                      API Key 已生成
                    </div>
                    <div className='flex flex-col gap-2 sm:flex-row'>
                      <div className='bg-background text-foreground min-w-0 flex-1 overflow-x-auto rounded-xl border px-3 py-2 font-mono text-sm'>
                        {apiKey}
                      </div>
                      <Button
                        variant='outline'
                        onClick={() => copyText(apiKey, 'API Key 已复制')}
                        className={cn('gap-2', copied && 'text-emerald-600')}
                      >
                        {copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
                        复制
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className='bg-blue-50/60 dark:bg-blue-950/20'>
              <CardContent className='space-y-4 p-5 sm:p-6'>
                <div className='flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300'>
                  <KeyRound className='h-5 w-5' />
                  客户端配置
                </div>
                <div className='space-y-3 rounded-2xl bg-background p-4 font-mono text-sm shadow-sm'>
                  <div>
                    <span className='text-muted-foreground'>API 地址：</span>
                    {API_BASE_URL}
                  </div>
                  <div>
                    <span className='text-muted-foreground'>API 密钥：</span>
                    sk-xxxxxxxx
                  </div>
                  <div>
                    <span className='text-muted-foreground'>模型：</span>
                    gpt-4o / claude-3.5-sonnet 等
                  </div>
                </div>
                <Button
                  variant='outline'
                  className='w-full gap-2'
                  onClick={() => copyText(API_BASE_URL, 'API 地址已复制')}
                >
                  <Copy className='h-4 w-4' />
                  复制 API 地址
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='tutorial' className='outline-none'>
          <div className='mx-auto max-w-3xl space-y-4'>
            {stepCard(
              1,
              '获取兑换码',
              '在官方店铺购买或参与活动获取兑换码，格式通常为 CBAI-XXXX-XXXX-XXXX。'
            )}
            {stepCard(
              2,
              '输入兑换码并提交',
              '切换到上方“兑换码”页签，将兑换码粘贴到输入框，点击“立即兑换”按钮。'
            )}
            {stepCard(
              3,
              '保存 API 密钥',
              '系统会自动生成 sk- 开头的 API Key，点击复制按钮立即保存。'
            )}
            {stepCard(
              4,
              '在客户端配置',
              <>
                在 Chatbox / Cherry Studio / Lobe Chat 等客户端中填入：
                <div className='mt-3 rounded-xl border bg-background p-3 font-mono text-xs'>
                  API 地址: {API_BASE_URL}
                  <br />
                  API 密钥: sk-xxxxxxxx
                  <br />
                  模型: gpt-4o / claude-3.5-sonnet 等
                </div>
              </>
            )}

            <div className='rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950/30 dark:text-blue-100'>
              <div className='mb-2 flex items-center gap-2 font-semibold'>
                <BookOpen className='h-4 w-4' />
                常见问题
              </div>
              <ul className='list-disc space-y-1 pl-5 leading-6'>
                <li>兑换码无法兑换：确认是否已被使用，或是否输入错误。</li>
                <li>密钥不显示：密钥仅在兑换期间显示一次，也可到“API 密钥”页面查看。</li>
                <li>客户端报 401：检查 API 地址末尾是否带 /v1，密钥前后是否有空格。</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
