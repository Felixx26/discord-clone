import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { ChannelType, MemberRole } from '@prisma/client';

export async function POST(req: Request) {
	try {
		const profile = await currentProfile();

		const { name, type } = await req.json();
		const { searchParams } = new URL(req.url);

		const serverId = searchParams.get('serverId');

		if (!profile) return new NextResponse('Unauthorized', { status: 401 });

		if (!serverId) return new NextResponse('Server id is missing', { status: 400 });

		if (name === 'general') return new NextResponse("Name cannot be 'general'", { status: 400 });

		const server = await db.server.update({
			where: {
				id: serverId,
				members: {
					some: {
						profileId: profile.id,
						role: {
							in: [MemberRole.ADMIN, MemberRole.MODERATOR],
						},
					},
				},
			},
			data: {
				channels: {
					create: {
						profileId: profile.id,
						name,
						type: type as ChannelType,
					},
				},
			},
		});

		if (!server) return new NextResponse('Server not found', { status: 404 });

		return new NextResponse(JSON.stringify(server), { status: 201 });
	} catch (error) {
		console.log('CHANNELS_POST: ', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}
