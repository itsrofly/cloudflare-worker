import * as PostalMime from 'postal-mime';
import * as Minio from 'minio';

interface ForwardableEmailMessage<Body = unknown> {
	readonly from: string;
	readonly to: string;
	readonly headers: Headers;
	readonly raw: ReadableStream;
	readonly rawSize: number;
	setReject: any;
}

export default {
	async email(message: ForwardableEmailMessage, env: any, ctx: any) {
		try {
			// Time
			const datetime = new Date();
			const now = datetime.getTime();

			const minioClient = new Minio.Client({
				endPoint: env.END_POINT,
				useSSL: true,
				accessKey: env.ACCESS_KEY,
				secretKey: env.SECRET_KEY,
			});

			const parser = new PostalMime.default();
			const rawEmail = new Response(message.raw);
			const email = JSON.stringify(await parser.parse(await rawEmail.arrayBuffer()));

			// Destination bucket
			const bucket = 'emails';

			// Destination object name
			const destinationObject = `${message.to}/${message.from}:${now}.json`;

			// Check if the bucket exists
			// If it doesn't, create it
			const exists = await minioClient.bucketExists(bucket);
			if (exists) {
				console.log('Bucket ' + bucket + ' exists.');
			} else {
				await minioClient.makeBucket(bucket, 'us-east-1');
				console.log('Bucket ' + bucket + ' created in "us-east-1".');
			}

			// Set the object metadata
			var metaData = {
				'Content-Type': 'application/json',
			};

			// Upload the file with fPutObject
			await minioClient.fPutObject(bucket, destinationObject, email, metaData);
		} catch (error) {
			console.error('Failed to process email:', error);
			message.setReject('Failed to process email.');
		}
	},
};
