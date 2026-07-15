import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import prisma from '$lib/server/db';

/**
 * CLEARSKY — SIGNAL HISTORY ENDPOINT
 * Returns the 20 most recent processed events for the Pipeline Test Center history tab.
 */
export const GET: RequestHandler = async () => {
    try {
        const events = await prisma.event.findMany({
            orderBy: { created_at: 'desc' },
            take: 20,
            select: {
                id: true,
                event_type: true,
                unstructured_text: true,
                review_text: true,
                author_name: true,
                created_at: true
            }
        });

        return json({ success: true, events });
    } catch (err: any) {
        return json({ success: false, error: err.message }, { status: 500 });
    }
};
