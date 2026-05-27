/*
Copyright (C) 2025 QuantumNous

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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Banner,
  Button,
  Card,
  Divider,
  Input,
  Space,
  TabPane,
  Tabs,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconBookmark,
  IconCopy,
  IconCreditCard,
  IconGift,
  IconHistogram,
  IconKey,
} from '@douyinfe/semi-icons';
import { API } from '../../helpers/api';
import { renderQuota } from '../../helpers';
import { copy, showError, showSuccess } from '../../helpers/utils';
import { fetchTokenKey } from '../../helpers/token';

const { Text, Title, Paragraph } = Typography;

const buildServerAddress = () => {
  try {
    const status = JSON.parse(localStorage.getItem('status') || '{}');
    if (status?.server_address) {
      return `${String(status.server_address).replace(/\/$/, '')}/v1`;
    }
  } catch (error) {
    console.warn('Failed to read server address from localStorage', error);
  }
  return `${window.location.origin}/v1`;
};

const ChatboxAI = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tokenStats, setTokenStats] = useState({
    redeemedCount: 0,
    activeCount: 0,
    availableQuota: 0,
    unlimitedCount: 0,
  });
  const apiAddress = useMemo(() => buildServerAddress(), []);

  const loadTokenStats = async () => {
    try {
      const res = await API.get('/api/token/?p=1&size=100');
      const { success, data } = res.data || {};
      if (!success) return;

      const tokens = data?.items || [];
      const chatboxTokens = tokens.filter((token) =>
        String(token?.name || '').toLowerCase().includes('chatbox ai'),
      );
      const source = chatboxTokens.length > 0 ? chatboxTokens : tokens;
      const activeTokens = source.filter((token) => token?.status === 1);
      const unlimitedCount = activeTokens.filter(
        (token) => token?.unlimited_quota,
      ).length;
      const availableQuota = activeTokens.reduce((sum, token) => {
        if (token?.unlimited_quota) return sum;
        return sum + Number(token?.remain_quota || 0);
      }, 0);

      setTokenStats({
        redeemedCount: source.length,
        activeCount: activeTokens.length,
        availableQuota,
        unlimitedCount,
      });
    } catch (error) {
      console.warn('Failed to load Chatbox token stats', error);
    }
  };

  const createChatboxKey = async () => {
    const res = await API.post('/api/token/', {
      name: `Chatbox AI ${new Date().toLocaleString()}`,
      remain_quota: -1,
      expired_time: -1,
      unlimited_quota: true,
      model_limits_enabled: false,
      model_limits: '',
      allow_ips: '',
      groups: '',
      used_quota: 0,
    });

    const { success, data, message } = res.data || {};
    if (!success) {
      throw new Error(message || '创建 API Key 失败');
    }

    const tokenId = data?.id || data;
    if (!tokenId) {
      throw new Error('创建成功但未返回 Token ID');
    }

    const rawKey = await fetchTokenKey(tokenId);
    return rawKey.startsWith('sk-') ? rawKey : `sk-${rawKey}`;
  };

  const redeem = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      showError('请输入兑换码');
      return;
    }

    setLoading(true);
    setApiKey('');
    try {
      const topupRes = await API.post('/api/user/topup', { key: trimmedCode });
      const { success, message } = topupRes.data || {};
      if (!success) {
        throw new Error(message || '兑换失败，请检查兑换码是否正确');
      }

      const key = await createChatboxKey();
      setApiKey(key);
      setCode('');
      await loadTokenStats();
      showSuccess('兑换成功，API Key 已生成');
    } catch (error) {
      showError(error?.message || '兑换失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text, message = '复制成功') => {
    const ok = await copy(text);
    if (ok) showSuccess(message);
  };

  useEffect(() => {
    loadTokenStats();
  }, []);

  const statItems = [
    {
      label: '已兑换',
      value: tokenStats.redeemedCount,
      icon: <IconGift />,
      color: 'from-orange-500 to-rose-500',
      bg: 'bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/30 dark:text-orange-200 dark:ring-orange-900/50',
    },
    {
      label: '活跃密钥',
      value: tokenStats.activeCount,
      icon: <IconKey />,
      color: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900/50',
    },
    {
      label: '可用额度',
      value:
        tokenStats.unlimitedCount > 0
          ? '无限额度'
          : renderQuota(tokenStats.availableQuota),
      icon: <IconCreditCard />,
      color: 'from-blue-500 to-indigo-500',
      bg: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-900/50',
    },
  ];

  const steps = [
    {
      title: '获取兑换码',
      desc: '在官方店铺购买或参与活动获取兑换码，格式示例：CBAI-XXXX-XXXX-XXXX',
    },
    {
      title: '输入兑换码并提交',
      desc: '切换到“兑换码”页签，将兑换码粘贴到输入框，点击“立即兑换”。',
    },
    {
      title: '保存 API 密钥',
      desc: '系统会自动生成 sk- 开头的 API Key，请第一时间复制保存。',
    },
    {
      title: '在客户端配置',
      desc: '在 Chatbox / Cherry Studio / Lobe Chat 等客户端中填入 API 地址和 API Key。',
    },
  ];

  return (
    <div className='mt-[60px] px-3 pb-12'>
      <Card
        bordered={false}
        className='mx-auto max-w-5xl overflow-hidden rounded-3xl shadow-sm'
        bodyStyle={{ padding: 0 }}
      >
        <div className='relative overflow-hidden bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 p-[2px] shadow-[0_22px_60px_rgba(244,63,94,0.28)]'>
          <div className='relative overflow-hidden rounded-[28px] bg-gradient-to-br from-white via-orange-50 to-rose-50 px-6 py-7 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:from-[#090909] dark:via-[#111111] dark:to-[#1f0b12] dark:text-white md:px-8'>
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(251,191,36,0.38),transparent_30%),radial-gradient(circle_at_88%_15%,rgba(244,63,94,0.22),transparent_34%),radial-gradient(circle_at_50%_105%,rgba(147,51,234,0.16),transparent_36%)] dark:bg-[radial-gradient(circle_at_12%_8%,rgba(250,204,21,0.42),transparent_30%),radial-gradient(circle_at_88%_15%,rgba(244,63,94,0.36),transparent_34%),radial-gradient(circle_at_50%_105%,rgba(147,51,234,0.34),transparent_36%)]' />
            <div className='pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-amber-300/45 blur-3xl dark:bg-yellow-400/30' />
            <div className='pointer-events-none absolute -right-20 -bottom-20 h-44 w-44 rounded-full bg-rose-300/40 blur-3xl dark:bg-rose-500/35' />
            <div className='pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-yellow-200/80' />
            <div className='relative grid gap-5 lg:grid-cols-[1fr_420px] lg:items-center'>
              <div className='flex flex-col gap-4'>
                <span className='inline-flex w-fit items-center gap-2 rounded-full bg-white/86 px-4 py-1.5 text-xs font-black tracking-[0.18em] text-orange-700 shadow-[0_10px_28px_rgba(249,115,22,0.18)] ring-1 ring-orange-200/80 backdrop-blur dark:bg-gradient-to-r dark:from-red-600 dark:via-orange-500 dark:to-yellow-400 dark:text-white dark:shadow-[0_0_28px_rgba(249,115,22,0.55)] dark:ring-white/20'>
                  <IconGift /> Chatbox AI
                </span>
                <div>
                  <Title
                    heading={2}
                    className='!m-0 !text-3xl !font-black !leading-tight !text-slate-950 drop-shadow-[0_2px_0_rgba(255,255,255,0.65)] dark:bg-gradient-to-r dark:from-red-500 dark:via-orange-400 dark:to-yellow-300 dark:bg-clip-text dark:!text-transparent dark:drop-shadow-[0_0_18px_rgba(251,146,60,0.45)] md:!text-4xl'
                  >
                    Chatbox AI
                  </Title>
                  <Paragraph className='!mt-2 !mb-0 !text-sm !font-semibold !text-slate-700 dark:!text-white/90 md:!text-base'>
                    兑换 API 密钥并查看完整使用教程
                  </Paragraph>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                {statItems.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl px-4 py-3 shadow-sm ring-1 backdrop-blur ${item.bg}`}
                  >
                    <div className='mb-2 flex items-center justify-between gap-2 text-xs font-bold'>
                      <span>{item.label}</span>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${item.color} text-white shadow-md`}
                      >
                        {item.icon}
                      </span>
                    </div>
                    <div className='truncate text-2xl font-black leading-none'>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className='px-5 py-6 md:px-8'>
          <Tabs type='line' defaultActiveKey='redeem'>
            <TabPane
              tab={
                <span className='inline-flex items-center gap-2'>
                  <IconGift /> 兑换码
                </span>
              }
              itemKey='redeem'
            >
              <div className='grid gap-5 md:grid-cols-[1fr_340px]'>
                <Card className='rounded-2xl border border-blue-100 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20'>
                  <Space vertical align='start' spacing='medium' className='w-full'>
                    <div>
                      <Title heading={4} style={{ marginBottom: 6 }}>
                        输入兑换码，自动生成 API Key
                      </Title>
                      <Text type='tertiary'>
                        兑换成功后会自动创建一个 Chatbox AI 专用密钥。
                      </Text>
                    </div>

                    <Input
                      size='large'
                      prefix={<IconGift />}
                      placeholder='请输入兑换码，例如 CBAI-XXXX-XXXX-XXXX'
                      value={code}
                      onChange={setCode}
                      onEnterPress={redeem}
                    />
                    <Button
                      size='large'
                      theme='solid'
                      type='primary'
                      loading={loading}
                      onClick={redeem}
                    >
                      立即兑换
                    </Button>
                  </Space>
                </Card>

                <Card className='rounded-2xl'>
                  <Space vertical align='start' spacing='medium' className='w-full'>
                    <Tag color='green' prefixIcon={<IconKey />}>
                      兑换结果
                    </Tag>
                    {apiKey ? (
                      <>
                        <Text strong>请立即复制保存 API Key：</Text>
                        <div className='w-full break-all rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-mono text-sm text-emerald-800'>
                          {apiKey}
                        </div>
                        <Button
                          theme='solid'
                          type='secondary'
                          icon={<IconCopy />}
                          onClick={() => copyText(apiKey, 'API Key 已复制')}
                        >
                          复制 API Key
                        </Button>
                      </>
                    ) : (
                      <Text type='tertiary'>
                        兑换完成后，这里会显示生成的 API Key。
                      </Text>
                    )}
                  </Space>
                </Card>
              </div>
            </TabPane>

            <TabPane
              tab={
                <span className='inline-flex items-center gap-2'>
                  <IconBookmark /> 使用教程
                </span>
              }
              itemKey='guide'
            >
              <div className='space-y-4'>
                {steps.map((step, index) => (
                  <Card key={step.title} className='rounded-2xl'>
                    <div className='flex gap-4'>
                      <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white'>
                        {index + 1}
                      </div>
                      <div>
                        <Text strong>{step.title}</Text>
                        <Paragraph type='tertiary' style={{ marginTop: 4, marginBottom: 0 }}>
                          {step.desc}
                        </Paragraph>
                      </div>
                    </div>
                  </Card>
                ))}

                <Card className='rounded-2xl bg-slate-50 dark:bg-slate-900/40'>
                  <Space vertical align='start' className='w-full'>
                    <Text strong>客户端配置示例</Text>
                    <div className='w-full rounded-xl bg-white p-4 font-mono text-sm dark:bg-slate-950'>
                      <div>API 地址: {apiAddress}</div>
                      <div>API 密钥: sk-cbai-xxxxxx</div>
                      <div>模型: gpt-4o / claude-3.5-sonnet 等</div>
                    </div>
                    <Button icon={<IconCopy />} onClick={() => copyText(apiAddress, 'API 地址已复制')}>
                      复制 API 地址
                    </Button>
                  </Space>
                </Card>

                <Banner
                  type='info'
                  fullMode={false}
                  closeIcon={null}
                  title='常见问题'
                  description={
                    <ul className='m-0 pl-4'>
                      <li>兑换码无法兑换：确认是否已被使用，或是否输入错误。</li>
                      <li>密钥不显示：可到“令牌管理 / API 密钥”页面查看。</li>
                      <li>客户端报 401：检查 API 地址末尾是否带 /v1，密钥前后是否有空格。</li>
                    </ul>
                  }
                />
              </div>
            </TabPane>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default ChatboxAI;
