import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

export const pusherServer = new PusherServer({
	appId: process.env.PUSHER_APP_ID!,
	key: process.env.PUSHER_APP_KEY!,
	secret: process.env.PUSHER_APP_SECRET!,
	cluster: process.env.PUSHER_APP_CLUSTER!,
});

export const pusherClient = new PusherClient('a257abe078040a479ea1', {
	cluster: 'mt1',
});
