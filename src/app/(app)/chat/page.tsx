'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Avatar } from '@/components/ui/avatar'
import { ChatChannel, ChatMessage, UserProfile } from '@/types'
import { Send, Plus, Hash, MessageSquare, X, Search, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({})
  const [input, setInput] = useState('')
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [showNewDM, setShowNewDM] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [dmSearch, setDmSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Carregar canais e utilizadores
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const load = async () => {
      setLoadingChannels(true)
      try {
        const [{ data: memberData, error: e1 }, { data: usrData, error: e2 }] = await Promise.all([
          supabase.from('chat_channel_members').select('channel_id').eq('user_id', user.id),
          supabase.from('profiles').select('*').order('full_name'),
        ])

        if (cancelled) return
        if (e1) console.error('chat_channel_members error:', e1)
        if (e2) console.error('profiles error:', e2)

        const channelIds = (memberData ?? []).map((m: { channel_id: string }) => m.channel_id)
        if (channelIds.length > 0) {
          const { data: channelData, error: e3 } = await supabase
            .from('chat_channels')
            .select('*')
            .in('id', channelIds)
            .order('created_at')
          if (e3) console.error('chat_channels error:', e3)
          if (!cancelled) {
            setChannels(channelData ?? [])
            if (channelData && channelData.length > 0) setSelectedChannel(channelData[0])
          }
        }

        const map: Record<string, UserProfile> = {}
        ;(usrData ?? []).forEach((u: UserProfile) => { map[u.id] = u })
        if (!cancelled) setUsersMap(map)
      } catch (err) {
        console.error('Chat load error:', err)
      } finally {
        if (!cancelled) setLoadingChannels(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user?.id])

  // Carregar mensagens e subscrever realtime
  useEffect(() => {
    if (!selectedChannel?.id) return
    let cancelled = false
    setLoadingMessages(true)
    setMessages([])

    supabase
      .from('chat_messages')
      .select('*')
      .eq('channel_id', selectedChannel.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        if (error) console.error('messages error:', error)
        if (!cancelled) {
          setMessages(data ?? [])
          setLoadingMessages(false)
        }
      })

    const sub = supabase
      .channel(`chat-${selectedChannel.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${selectedChannel.id}`,
      }, (payload) => {
        if (!cancelled) setMessages(prev => [...prev, payload.new as ChatMessage])
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(sub)
    }
  }, [selectedChannel?.id])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !selectedChannel || sending || !user) return
    const content = input.trim()
    setInput('')
    setSending(true)
    const { error } = await supabase.from('chat_messages').insert({
      channel_id: selectedChannel.id,
      sender_id: user.id,
      content,
    })
    if (error) console.error('send error:', error)
    setSending(false)
    inputRef.current?.focus()
  }

  const createChannel = async () => {
    if (!newChannelName.trim() || !user) return
    const { data, error } = await supabase
      .from('chat_channels')
      .insert({ name: newChannelName.trim(), type: 'group', created_by: user.id })
      .select('*')
      .single()
    if (error) { console.error('create channel error:', error); return }
    if (data) {
      await supabase.from('chat_channel_members').insert({ channel_id: data.id, user_id: user.id })
      setChannels(prev => [...prev, data])
      setSelectedChannel(data)
    }
    setNewChannelName('')
    setShowNewChannel(false)
  }

  const startDM = async (targetUser: UserProfile) => {
    if (!user) return

    const dmName1 = `dm:${user.id}:${targetUser.id}`
    const dmName2 = `dm:${targetUser.id}:${user.id}`

    // Verificar se já existe localmente
    const localDM = channels.find(c => c.name === dmName1 || c.name === dmName2)
    if (localDM) {
      setSelectedChannel(localDM)
      setShowNewDM(false)
      setDmSearch('')
      return
    }

    // Usar RPC atómica que encontra ou cria o DM sem problemas de RLS
    const { data: channelId, error } = await supabase.rpc('get_or_create_dm', {
      target_user_id: targetUser.id,
    })

    if (error) { console.error('DM error:', error); return }

    // Buscar o canal criado/encontrado
    const { data: ch, error: e2 } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('id', channelId)
      .single()

    if (e2) { console.error('DM fetch error:', e2); return }

    if (ch) {
      setChannels(prev => prev.find(c => c.id === ch.id) ? prev : [...prev, ch])
      setSelectedChannel(ch)
    }

    setShowNewDM(false)
    setDmSearch('')
  }

  const getChannelLabel = (ch: ChatChannel) => {
    if (ch.type === 'direct') {
      const name = ch.name ?? ''
      if (name.startsWith('dm:')) {
        const parts = name.split(':')
        const id1 = parts[1]
        const id2 = parts[2]
        const otherId = id1 === user?.id ? id2 : id1
        return usersMap[otherId]?.full_name ?? 'Mensagem Direta'
      }
      return name || 'Mensagem Direta'
    }
    return ch.name ?? 'Canal'
  }

  const groupedMessages = messages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
    const last = acc[acc.length - 1]
    if (last && last.date === date) last.msgs.push(msg)
    else acc.push({ date, msgs: [msg] })
    return acc
  }, [])

  const groupChannels = channels.filter(c => c.type !== 'direct')
  const dmChannels = channels.filter(c => c.type === 'direct')
  const otherUsers = Object.values(usersMap).filter(u => u.id !== user?.id)
  const filteredUsers = otherUsers.filter(u =>
    u.full_name.toLowerCase().includes(dmSearch.toLowerCase())
  )

  if (loadingChannels) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-56px)] md:h-[calc(100vh-0px)] -mx-4 md:-mx-6 -mt-0 md:-mt-6 overflow-hidden">
      {/* Sidebar de canais — esconde no mobile quando canal selecionado */}
      <div className={cn(
        'bg-gray-800 flex flex-col shrink-0',
        'w-full md:w-56',
        selectedChannel ? 'hidden md:flex' : 'flex'
      )}>
        <div className="px-4 py-4 border-b border-gray-700">
          <p className="text-xs font-bold text-white uppercase tracking-wider">Chat</p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Canais de grupo */}
          <div className="px-3 mb-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Canais</p>
              <button onClick={() => setShowNewChannel(true)} className="text-gray-400 hover:text-white p-0.5 rounded">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {showNewChannel && (
            <div className="px-3 mb-2">
              <div className="flex gap-1">
                <input
                  autoFocus
                  type="text"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createChannel(); if (e.key === 'Escape') setShowNewChannel(false) }}
                  placeholder="Nome do canal"
                  className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1.5 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={createChannel} className="text-blue-400 hover:text-blue-300 p-1"><Send size={13} /></button>
                <button onClick={() => setShowNewChannel(false)} className="text-gray-500 hover:text-gray-300 p-1"><X size={13} /></button>
              </div>
            </div>
          )}

          <div className="space-y-0.5 px-2 mb-4">
            {groupChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors',
                  selectedChannel?.id === ch.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                )}
              >
                <Hash size={14} className="shrink-0" />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>

          {/* Mensagens diretas */}
          <div className="px-3 mb-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Diretas</p>
              <button onClick={() => setShowNewDM(!showNewDM)} className="text-gray-400 hover:text-white p-0.5 rounded">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {showNewDM && (
            <div className="px-3 mb-2">
              <div className="relative mb-1">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  autoFocus
                  type="text"
                  value={dmSearch}
                  onChange={e => setDmSearch(e.target.value)}
                  placeholder="Pesquisar..."
                  className="w-full bg-gray-700 text-white text-xs rounded pl-6 pr-2 py-1.5 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startDM(u)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-left"
                  >
                    <Avatar name={u.full_name} size="sm" className="h-5 w-5 text-[9px]" />
                    <span className="truncate text-xs">{u.full_name}</span>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-xs text-gray-500 px-2 py-1">Nenhum utilizador</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-0.5 px-2">
            {dmChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors',
                  selectedChannel?.id === ch.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                )}
              >
                <MessageSquare size={13} className="shrink-0" />
                <span className="truncate text-xs">{getChannelLabel(ch)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Área de mensagens — esconde no mobile quando sem canal */}
      <div className={cn(
        'flex-1 flex flex-col bg-white overflow-hidden',
        !selectedChannel && 'hidden md:flex'
      )}>
        {selectedChannel ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 shrink-0 bg-white">
              {/* Botão voltar no mobile */}
              <button
                onClick={() => setSelectedChannel(null)}
                className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft size={20} />
              </button>
              {selectedChannel.type === 'direct'
                ? <MessageSquare size={16} className="text-gray-400" />
                : <Hash size={16} className="text-gray-400" />}
              <span className="font-semibold text-gray-900">{getChannelLabel(selectedChannel)}</span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    {selectedChannel.type === 'direct'
                      ? <MessageSquare size={22} className="text-gray-400" />
                      : <Hash size={22} className="text-gray-400" />}
                  </div>
                  <p className="font-semibold text-gray-700">
                    {selectedChannel.type === 'direct' ? 'Início da conversa' : `#${selectedChannel.name}`}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Envia a primeira mensagem.</p>
                </div>
              ) : (
                groupedMessages.map(({ date, msgs }) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="text-xs text-gray-400 capitalize">{date}</span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>
                    <div className="space-y-1">
                      {msgs.map((msg, idx) => {
                        const sender = usersMap[msg.sender_id]
                        const isOwn = msg.sender_id === user?.id
                        const prevMsg = idx > 0 ? msgs[idx - 1] : null
                        const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id
                        return (
                          <div key={msg.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse', !showAvatar && (isOwn ? 'pr-11' : 'pl-11'))}>
                            {showAvatar && (
                              <Avatar name={sender?.full_name ?? '?'} size="md" className="shrink-0 mt-0.5" />
                            )}
                            <div className={cn('max-w-[65%]', isOwn && 'items-end flex flex-col')}>
                              {showAvatar && (
                                <p className={cn('text-xs font-semibold mb-1', isOwn ? 'text-right text-blue-600' : 'text-gray-600')}>
                                  {isOwn ? 'Tu' : (sender?.full_name ?? '')}
                                </p>
                              )}
                              <div className={cn(
                                'px-4 py-2 text-sm rounded-2xl leading-relaxed',
                                isOwn ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                              )}>
                                {msg.content}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                                {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
              <div className="flex gap-2 items-center bg-gray-50 rounded-2xl border border-gray-200 px-4 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder={`Mensagem em ${getChannelLabel(selectedChannel)}...`}
                  className="flex-1 bg-transparent text-sm focus:outline-none text-gray-900 placeholder:text-gray-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 ml-1">Enter para enviar</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400">Seleciona um canal para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
