import { redirect } from 'next/navigation';
import { ChannelType, MemberRole } from '@prisma/client';

import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ServerHeader } from './server-header';
import { ServerSearch } from './server-search';
import { Hash, Mic, ShieldAlert, ShieldCheck, Video } from 'lucide-react';

interface ServerSidebarProps {
	serverId: string;
}

const iconMap = {
	[ChannelType.TEXT]: <Hash className="h-4 w-4 mr-2" />,
	[ChannelType.AUDIO]: <Mic className="h-4 w-4 mr-2" />,
	[ChannelType.VIDEO]: <Video className="h-4 w-4 mr-2" />,
};

const roleIconMap = {
	[MemberRole.GUEST]: null,
	[MemberRole.MODERATOR]: <ShieldCheck className="h-4 w-h mr-2 text-indigo-500" />,
	[MemberRole.ADMIN]: <ShieldAlert className="h-4 w-h mr-2 text-rose-500" />,
};
export const ServerSidebar = async ({ serverId }: ServerSidebarProps) => {
	const profile = await currentProfile();

	if (!profile) return redirect('/');

	const server = await db.server.findUnique({
		where: {
			id: serverId,
		},
		include: {
			channels: {
				orderBy: {
					createdAt: 'asc',
				},
			},
			members: {
				include: {
					profile: true,
				},
				orderBy: {
					role: 'asc',
				},
			},
		},
	});

	if (!server) return redirect('/');

	const textChannels = server?.channels.filter((channel) => channel.type === ChannelType.TEXT);
	const audioChannels = server?.channels.filter((channel) => channel.type === ChannelType.AUDIO);
	const videoChannels = server?.channels.filter((channel) => channel.type === ChannelType.VIDEO);

	const members = server?.members.filter((member) => member.profileId !== profile?.id);

	const role = server?.members.find((member) => member.profileId === profile?.id)?.role;

	return (
		<div className="flex flex-col h-full text-primary w-full dark:bg-[#2B2D31] bg-[#F2F3F5]">
			<ServerHeader
				server={server}
				role={role}
			/>
			<ScrollArea className="flex-1 px-3">
				<ServerSearch
					data={[
						{
							label: 'Text channels',
							type: 'channel',
							data: textChannels?.map((channel) => ({
								icon: iconMap[channel.type],
								name: channel.name,
								id: channel.id,
							})),
						},
						{
							label: 'Voice channels',
							type: 'channel',
							data: audioChannels?.map((channel) => ({
								icon: iconMap[channel.type],
								name: channel.name,
								id: channel.id,
							})),
						},
						{
							label: 'Video channels',
							type: 'channel',
							data: videoChannels?.map((channel) => ({
								icon: iconMap[channel.type],
								name: channel.name,
								id: channel.id,
							})),
						},
						{
							label: 'Members',
							type: 'member',
							data: members?.map((member) => ({
								icon: roleIconMap[member.role],
								name: member.profile.name,
								id: member.id,
							})),
						},
					]}
				/>
			</ScrollArea>
		</div>
	);
};
