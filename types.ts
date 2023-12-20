import { Member, Profile, Server } from '@prisma/client';

export type ServerWhitMembersWithProfiles = Server & {
	members: (Member & {
		profile: Profile;
	})[];
};
