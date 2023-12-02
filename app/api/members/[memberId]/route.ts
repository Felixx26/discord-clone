import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

export async function DELETE(req: Request, { params }: { params: { memberId: string } }) {
	try {
		const profile = await currentProfile();
		const { searchParams } = new URL(req.url);
		const serverId = searchParams.get('serverId');

		if (!profile) return new Response('Unauthorized', { status: 401 });

		if (!serverId) return new Response('Server id is missing', { status: 400 });

		if (!params.memberId) return new Response('members id is missing', { status: 400 });

		const server = await db.server.update({
			where: {
				id: serverId,
				profileId: profile.id,
			},
			data: {
				members: {
					deleteMany: {
						id: params.memberId,
						profileId: {
							not: profile.id,
						},
					},
				},
			},
			include: {
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

		if (!server) return new Response('Server not found', { status: 404 });

		return new Response(JSON.stringify(server), { status: 201 });
	} catch (error) {
		console.log('[MEMBERS_ID_DELETE]', error);
		return new Response('Internal Error', { status: 500 });
	}
}

export async function PATCH(req: Request, { params }: { params: { memberId: string } }) {
	try {
		const profile = await currentProfile();
		const { searchParams } = new URL(req.url);
		const { role } = await req.json();

		const serverId = searchParams.get('serverId');

		if (!profile) return new Response('Unauthorized', { status: 401 });

		if (!serverId) return new Response('Server id is missing', { status: 400 });

		if (!params.memberId) return new Response('members id is missing', { status: 400 });
		console.log(params);
		const server = await db.server.update({
			where: {
				id: serverId,
				profileId: profile.id,
			},
			data: {
				members: {
					update: {
						where: {
							id: params.memberId,
							profileId: {
								not: profile.id,
							},
						},
						data: {
							role,
						},
					},
				},
			},
			include: {
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

		if (!server) return new Response('Server not found', { status: 404 });

		return new Response(JSON.stringify(server), { status: 201 });
	} catch (error) {
		console.log('[MEMBERS_ID_PATCH]', error);
	}
}
