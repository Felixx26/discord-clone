import { currentProfile } from '@/lib/current-profile';
import { NextResponse } from 'next/server';
import { MemberRole, Message } from '@prisma/client';
import { db } from '@/lib/db';
import { pusherServer } from '@/lib/pusher';

const MESSAGES_BATCH = 10;

export async function GET(req: Request) {
	try {
		const profile = await currentProfile();
		const { searchParams } = new URL(req.url);

		const cursor = searchParams.get('cursor');
		const channelId = searchParams.get('channelId');

		if (!profile) return new NextResponse('Unauthorized', { status: 401 });

		if (!channelId) return new NextResponse('Channel ID missing', { status: 400 });

		let messages: Message[] = [];

		if (cursor) {
			messages = await db.message.findMany({
				take: MESSAGES_BATCH,
				skip: 1,
				cursor: {
					id: cursor,
				},
				where: {
					channelId,
				},
				include: {
					member: {
						include: {
							profile: true,
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
			});
		} else {
			messages = await db.message.findMany({
				take: MESSAGES_BATCH,
				where: {
					channelId,
				},
				include: {
					member: {
						include: {
							profile: true,
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
			});
		}

		let nextCursor = null;

		if (messages.length === MESSAGES_BATCH) {
			nextCursor = messages[MESSAGES_BATCH - 1].id;
		}

		return NextResponse.json({
			items: messages,
			nextCursor,
		});
	} catch (error) {
		console.log('[MESSAGES_GET]', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const profile = await currentProfile();
		const body = await req.json();
		const { content, fileUrl } = body;
		const { searchParams } = new URL(req.url);
		const channelId = searchParams.get('channelId');
		const serverId = searchParams.get('serverId');

		if (!profile) return new NextResponse('Unauthorized', { status: 401 });

		if (!serverId) return new NextResponse('Server ID is missing', { status: 400 });

		if (!channelId) new NextResponse('Channel ID is missing', { status: 400 });

		if (!content) new NextResponse('Content ID is missing', { status: 400 });

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
				serverId: server.id,
			},
		});

		if (!channel) return new NextResponse('Channel not found', { status: 404 });

		const member = server.members.find((member) => member.profileId === profile.id);

		if (!member) return new NextResponse('Member not found', { status: 404 });

		const message = await db.message.create({
			data: {
				content,
				fileUrl,
				channelId: channel.id as string,
				memberId: member.id,
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
		console.log('MESSAGES_POST', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
