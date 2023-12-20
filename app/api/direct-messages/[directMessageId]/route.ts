import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { MemberRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function PATCH(req: Request, { params }: { params: { directMessageId: string } }) {
	try {
		const profile = await currentProfile();
		const { searchParams } = new URL(req.url);
		const conversationId = searchParams.get('conversationId');
		const { content } = await req.json();

		if (!profile) return new NextResponse('Unauthorized', { status: 401 });

		if (!conversationId) return new NextResponse('Conversation not found', { status: 404 });

		const conversation = await db.conversation.findFirst({
			where: {
				id: conversationId as string,
				OR: [
					{
						memberOne: {
							profileId: profile.id,
						},
					},
					{
						memberTwo: {
							profileId: profile.id,
						},
					},
				],
			},
			include: {
				memberOne: {
					include: {
						profile: true,
					},
				},
				memberTwo: {
					include: {
						profile: true,
					},
				},
			},
		});

		if (!conversation) return new NextResponse('Conversation not found', { status: 404 });

		const member = conversation.memberOne.profileId === profile.id ? conversation.memberOne : conversation.memberTwo;

		if (!member) return new NextResponse('Member not found', { status: 404 });

		let directMessage = await db.directMessage.findFirst({
			where: {
				id: params.directMessageId,
				conversationId: conversationId as string,
			},
			include: {
				member: {
					include: {
						profile: true,
					},
				},
			},
		});

		if (!directMessage || directMessage.deleted) return new NextResponse('Message not found', { status: 404 });

		const isMessageOwner = directMessage.member.profileId === profile.id;
		const isAdmin = member.role === MemberRole.ADMIN;
		const isModerator = member.role === MemberRole.MODERATOR;
		const canModify = isMessageOwner || isAdmin || isModerator;

		if (!canModify) return new NextResponse('Forbidden', { status: 403 });

		if (!isMessageOwner) return new NextResponse('Forbidden', { status: 403 });

		directMessage = await db.directMessage.update({
			where: {
				id: params.directMessageId as string,
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

		await pusherServer.trigger(conversation.id, 'new-message', directMessage);

		return NextResponse.json(directMessage, { status: 200 });
	} catch (error) {
		console.log('MESSAGE_ID', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
export async function DELETE(req: Request, { params }: { params: { directMessageId: string } }) {
	try {
		const profile = await currentProfile();
		const { searchParams } = new URL(req.url);
		const conversationId = searchParams.get('conversationId');

		if (!profile) return new NextResponse('Unauthorized', { status: 401 });

		if (!conversationId) return new NextResponse('Conversation not found', { status: 404 });

		const conversation = await db.conversation.findFirst({
			where: {
				id: conversationId as string,
				OR: [
					{
						memberOne: {
							profileId: profile.id,
						},
					},
					{
						memberTwo: {
							profileId: profile.id,
						},
					},
				],
			},
			include: {
				memberOne: {
					include: {
						profile: true,
					},
				},
				memberTwo: {
					include: {
						profile: true,
					},
				},
			},
		});

		if (!conversation) return new NextResponse('Conversation not found', { status: 404 });

		const member = conversation.memberOne.profileId === profile.id ? conversation.memberOne : conversation.memberTwo;

		if (!member) return new NextResponse('Member not found', { status: 404 });

		let directMessage = await db.directMessage.findFirst({
			where: {
				id: params.directMessageId,
				conversationId: conversationId as string,
			},
			include: {
				member: {
					include: {
						profile: true,
					},
				},
			},
		});

		if (!directMessage || directMessage.deleted) return new NextResponse('Message not found', { status: 404 });

		const isMessageOwner = directMessage.member.profileId === profile.id;
		const isAdmin = member.role === MemberRole.ADMIN;
		const isModerator = member.role === MemberRole.MODERATOR;
		const canModify = isMessageOwner || isAdmin || isModerator;

		if (!canModify) return new NextResponse('Forbidden', { status: 403 });

		directMessage = await db.directMessage.update({
			where: {
				id: params.directMessageId,
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

		await pusherServer.trigger(conversation.id, 'new-message', directMessage);

		return NextResponse.json(directMessage, { status: 200 });
	} catch (error) {
		console.log('MESSAGE_ID', error);
		return new NextResponse(`Internal server error ${error}`, { status: 500 });
	}
}
