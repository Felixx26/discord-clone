import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { serverId: string } }) {
	try {
		const profile = await currentProfile();

		if (!profile) return new NextResponse('Unauthorized', { status: 401 });

		if (!params.serverId) return new NextResponse('Server id is missing', { status: 400 });

		const server = await db.server.update({
			where: {
				id: params.serverId,
				profileId: profile.id,
			},
			data: {
				inviteCode: uuid(),
			},
		});
		console.log('[SERVERS_PATCH]', server);

		return NextResponse.json(server, { status: 201 });
	} catch (error) {
		console.log('[SERVERS_PATCH]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}
