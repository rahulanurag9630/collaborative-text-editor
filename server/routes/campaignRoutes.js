import express from 'express';
import { Campaign } from '../models/Campaign.js';

const router = express.Router();

// GET /campaigns → Fetch all campaigns
router.get('/', async (req, res) => {
    try {
        const campaigns = await Campaign.find().sort({ created_at: -1 });
        res.json({ campaigns });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

// POST /campaigns → Add a new campaign
router.post('/', async (req, res) => {
    try {
        const { name, type, description, status, sent, replies } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        const campaign = await Campaign.create({
            name,
            type,
            description,
            status: status || 'draft',
            sent: sent || 0,
            replies: replies || 0,
        });

        res.status(201).json({ message: 'Campaign created successfully', campaign });
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

export default router;
