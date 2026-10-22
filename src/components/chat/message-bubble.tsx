import Image from 'next/image';
import Link from 'next/link';
import type { ChatMessage } from '@/lib/client/ai-contract';
import { ExpandableText } from '@/components/ui/expandable-text';
import type { useChatActions } from './use-chat-actions';
import { ProposalList } from './proposal-list';

export function MessageBubble({ message, actions, pending }: { message: ChatMessage; actions: ReturnType<typeof useChatActions>; pending: boolean }) {
  const response = message.response;
  return <div className={`chat-message ${message.role === 'user' ? 'chat-message-user' : ''}`}>
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{message.role === 'user' ? 'You' : 'ApplyDesk'}</p>
    {message.text && <div className="whitespace-pre-wrap text-sm leading-relaxed"><ExpandableText text={message.text} lines={message.role === 'assistant' ? 8 : 3} /></div>}
    {message.imageUrl && <Image src={message.imageUrl} alt="Your screenshot" width={220} height={140} unoptimized className="mt-3 max-h-36 max-w-full rounded border object-contain" />}
    {message.transcript && <div className="mt-2 whitespace-pre-wrap text-sm italic"><ExpandableText text={message.transcript} lines={3} /></div>}
    {response?.queryResult && <div className="mt-3 space-y-2 text-xs"><ExpandableText text={response.queryResult.text} lines={3} /><ul className="divide-y">{response.queryResult.items.map((item) => <li key={item.id}><Link className="block min-h-11 py-2 underline" href={response.queryResult!.entity === 'job' ? '/jobs' : response.queryResult!.entity === 'certification' ? '/certifications' : '/todos'}><ExpandableText text={item.label} lines={2} /><span className="mt-1 block text-muted-foreground">{item.detail}</span></Link></li>)}</ul></div>}
    {Boolean(response?.proposals.length) && <div className="mt-4"><ProposalList proposals={response!.proposals} actions={actions} sending={pending} /></div>}
  </div>;
}
