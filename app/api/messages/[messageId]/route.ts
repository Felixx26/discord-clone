import { currentProfile } from '@/lib/current-profile';
import { NextResponse } from 'next/server';
import { MemberRole, Message } from '@prisma/client';
import { db } from '@/lib/db';
import { pusherServer } from '@/lib/pusher';

export async function PATCH(req: Request, { params }: { params: { messageId: string } }) {
	try {
		const profile = await currentProfile();
		const body = await req.json();
		const { searchParams } = new URL(req.url);
		const channelId = searchParams.get('channelId');
		const serverId = searchParams.get('serverId');
		const { messageId } = params;
		const { content } = body;

		if (!profile) return new NextResponse('Unauthorized', { status: 401 });

		if (!serverId) return new NextResponse('Server ID is missing', { status: 400 });

		if (!channelId) new NextResponse('Channel ID is missing', { status: 400 });

		if (!content) new NextResponse('Content ID is missing', { status: 400 });

		if (!messageId) new NextResponse('Message ID is missing', { status: 400 });

		const server = await db.server.findFirst({
			where: {
				id: serverId as string,
				members: {
					some: {
						profileId: profile.id,
					},
				},
			},
			include: {
				members: true,
			},
		});

		if (!server) return new NextResponse('Server not found', { status: 404 });

		const channel = await db.channel.findFirst({
			where: {
				id: channelId as string,
				serverId: server.id as string,
			},
		});

		if (!channel) return new NextResponse('Channel not found', { status: 404 });

		const member = server.members.find((member) => member.profileId === profile.id);

		if (!member) return new NextResponse('Member not found', { status: 404 });

		let message = await db.message.findFirst({
			where: {
				id: messageId as string,
				channelId: channel.id as string,
			},
			include: {
				member: {
					include: {
						profile: true,
					},
				},
			},
		});

		if (!message || message.deleted) return new NextResponse('Message not found', { status: 404 });

		const isMessageOwner = message.member.profileId === profile.id;
		const isAdmin = member.role === MemberRole.ADMIN;
		const isModerator = member.role === MemberRole.MODERATOR;
		const canModify = isMessageOwner || isAdmin || isModerator;

		if (!canModify || !isMessageOwner) return new NextResponse('Forbidden', { status: 403 });

		message = await db.message.update({
			where: {
				id: message.id,
			},
			data: {
				content,
			},
			include: {
				member: {
					include: {
						profile: true,
					},
				},
			},
		});

		await pusherServer.trigger(channel.id, 'new-message', message);

		return NextResponse.json(message, { status: 200 });
	} catch (error) {
		console.log('MESSAGE_ID', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}

export async function DELETE(req: Request, { params }: { params: { messageId: string } }) {
	try {
		const profile = await currentProfile();
		const { searchParams } = new URL(req.url);
		const channelId = searchParams.get('channelId');
		const serverId = searchParams.get('serverId');
		const { messageId } = params;

		if (!profile) return new NextResponse('Unauthorized', { status: 401 });

		if (!serverId) return new NextResponse('Server ID is missing', { status: 400 });

		if (!channelId) new NextResponse('Channel ID is missing', { status: 400 });

		if (!messageId) new NextResponse('Message ID is missing', { status: 400 });

		const server = await db.server.findFirst({
			where: {
				id: serverId as string,
				members: {
					some: {
						profileId: profile.id,
					},
				},
			},
			include: {
				members: true,
			},
		});

		if (!server) return new NextResponse('Server not found', { status: 404 });

		const channel = await db.channel.findFirst({
			where: {
				id: channelId as string,
				serverId: server.id as string,
			},
		});

		if (!channel) return new NextResponse('Channel not found', { status: 404 });

		const member = server.members.find((member) => member.profileId === profile.id);

		if (!member) return new NextResponse('Member not found', { status: 404 });

		let message = await db.message.findFirst({
			where: {
				id: messageId as string,
				channelId: channel.id as string,
			},
			include: {
				member: {
					include: {
						profile: true,
					},
				},
			},
		});

		if (!message || message.deleted) return new NextResponse('Message not found', { status: 404 });

		const isMessageOwner = message.member.profileId === profile.id;
		const isAdmin = member.role === MemberRole.ADMIN;
		const isModerator = member.role === MemberRole.MODERATOR;
		const canModify = isMessageOwner || isAdmin || isModerator;

		if (!canModify) return new NextResponse('Forbidden', { status: 403 });

		message = await db.message.update({
			where: {
				id: message.id,
			},
			data: {
				fileUrl: null,
				content: 'This message has been deleted',
				deleted: true,
			},
			include: {
				member: {
					include: {
						profile: true,
					},
				},
			},
		});

		await pusherServer.trigger(channel.id, 'new-message', message);

		return NextResponse.json(message, { status: 201 });
	} catch (error) {
		console.log('MESSAGE_ID', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
