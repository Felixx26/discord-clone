'use client';

import { Fragment, useRef, ElementRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Member, Message, Profile } from '@prisma/client';
import { Loader2, ServerCrash } from 'lucide-react';
import { useChatQuery } from '@/hooks/use-chat-query';
import { ChatWelcome } from './chat-welcome';
import { ChatItem } from './chat-item';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import { pusherClient } from '@/lib/pusher';

const DATE_FORMAT = 'd MMM yyyy HH:mm';

type MessageWithMemberWhitProfile = Message & {
	member: Member & {
		profile: Profile;
	};
};

interface ChatMessagesProps {
	name: string;
	member: Member;
	chatId: string;
	apiUrl: string;
	query: Record<string, string>;
	paramKey: 'channelId' | 'conversationId';
	paramValue: string;
	type: 'channel' | 'conversation';
}

export const ChatMessages = ({
	name,
	member,
	chatId,
	apiUrl,
	query,
	paramKey,
	paramValue,
	type,
}: ChatMessagesProps) => {
	const queryKey = `chat:${chatId}`;
	const addKey = `chat:${chatId}:messages`;
	const updateKey = `chat:${chatId}:messages:update`;

	const chatRef = useRef<ElementRef<'div'>>(null);
	const bottomRef = useRef<ElementRef<'div'>>(null);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, refetch } = useChatQuery({
		queryKey,
		apiUrl,
		paramKey,
		paramValue,
	});

	useEffect(() => {
		pusherClient.subscribe(chatId);
		const messageHandler = () => {
			refetch();
		};

		pusherClient.bind('new-message', messageHandler);
		return () => {
			pusherClient.unsubscribe(chatId);
			pusherClient.unbind('new-message', messageHandler);
		};
	}, [chatId, refetch]);

	useChatScroll({
		chatRef,
		bottomRef,
		loadMore: fetchNextPage,
		shouldLoadMore: !isFetchingNextPage && !!hasNextPage,
		count: data?.pages?.[0]?.items?.length ?? 0,
	});

	if (status === 'pending') {
		return (
			<div className="flex flex-col flex-1 justify-center items-center">
				<Loader2 className="h-7 w-7 text-zinc-500 animate-spin" />
				<p className="text-xs text-zinc-500 dark:text-zinc-400">Loading messages...</p>
			</div>
		);
	}
	if (status === 'error') {
		return (
			<div className="flex flex-col flex-1 justify-center items-center">
				<ServerCrash className="h-7 w-7 text-zinc-500" />
				<p className="text-xs text-zinc-500 dark:text-zinc-400">Something went wrong!</p>
			</div>
		);
	}

	return (
		<div
			ref={chatRef}
			className="flex-1 flex flex-col py-4 overflow-y-auto"
		>
			{!hasNextPage && <div className="flex-1" />}
			{!hasNextPage && (
				<ChatWelcome
					type={type}
					name={name}
				/>
			)}
			{hasNextPage && (
				<div className="flex justify-center">
					{isFetchingNextPage ? (
						<Loader2 className="h-6 w-6 text-zinc-500 animate-spin my-4" />
					) : (
						<button
							onClick={() => fetchNextPage()}
							className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 text-xs my-4 dark:hover:text-zinc-300 transition"
						>
							Load previous messages
						</button>
					)}
				</div>
			)}
			<div className="flex flex-col-reverse mt-auto">
				{data?.pages?.map((group, i) => (
					<Fragment key={i}>
						{group.items.map((message: MessageWithMemberWhitProfile) => (
							<ChatItem
								key={message.id}
								id={message.id}
								currentMember={member}
								member={message.member}
								content={message.content}
								fileUrl={message.fileUrl}
								deleted={message.deleted}
								timestamp={format(new Date(message.createdAt), DATE_FORMAT)}
								isUpdated={message.updatedAt !== message.createdAt}
								apiUrl={apiUrl}
								query={query}
							/>
						))}
					</Fragment>
				))}
			</div>
			<div ref={bottomRef} />
		</div>
	);
};
