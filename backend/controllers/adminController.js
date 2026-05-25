const { demoUsers } = require('../config/demoUsers');

const getDashboard = async (req, res) => {
    try {
        const totalUsers = demoUsers.length;
        const totalGroups = 1;
        const totalChiefs = demoUsers.filter(u => u.role === 'chief').length;
        const totalMembers = demoUsers.filter(u => u.role === 'member').length;
        const totalContributions = 15000;
        const totalLoans = 5000;

        res.json({
            totalUsers,
            totalGroups,
            totalChiefs,
            totalMembers,
            totalContributions,
            totalLoans,
            recentActivity: [
                { action: 'New user registered', time: '2 hours ago' },
                { action: 'Group created', time: '5 hours ago' },
                { action: 'Loan approved', time: '1 day ago' }
            ]
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error loading dashboard' });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = demoUsers.map(u => ({
            id: u.id,
            username: u.email.split('@')[0],
            email: u.email,
            full_name: u.full_name,
            phone: u.phone,
            role: u.role,
            status: u.status,
            created_at: u.created_at
        }));

        res.json({ users });
    } catch (error) {
        console.error('Users error:', error);
        res.status(500).json({ message: 'Server error fetching users' });
    }
};

const createChief = async (req, res) => {
    try {
        const { username, email, password, full_name, phone } = req.body;
        
        const newChief = {
            id: demoUsers.length + 1,
            username,
            email,
            password,
            full_name,
            phone,
            role: 'chief',
            status: 'active',
            created_at: new Date()
        };

        demoUsers.push(newChief);

        res.status(201).json({
            message: 'Chief created successfully',
            chief: newChief
        });
    } catch (error) {
        console.error('Create chief error:', error);
        res.status(500).json({ message: 'Server error creating chief' });
    }
};

const deleteChief = async (req, res) => {
    try {
        const { id } = req.params;
        const index = demoUsers.findIndex(u => u.id == id && u.role === 'chief');
        
        if (index !== -1) {
            demoUsers.splice(index, 1);
            res.json({ message: 'Chief deleted successfully' });
        } else {
            res.status(404).json({ message: 'Chief not found' });
        }
    } catch (error) {
        console.error('Delete chief error:', error);
        res.status(500).json({ message: 'Server error deleting chief' });
    }
};

const getAllGroups = async (req, res) => {
    try {
        const groups = [
            {
                id: 1,
                group_name: 'Abishyizehamwe Group',
                group_code: 'IKB001',
                district: 'Kigali',
                sector: 'Gasabo',
                cell_name: 'Kimironko',
                village: 'Bibare',
                contribution_amount: 5000,
                frequency: 'weekly',
                draw_day: 'Friday',
                status: 'active',
                chief_id: 2,
                created_at: new Date()
            }
        ];

        res.json({ groups });
    } catch (error) {
        console.error('Groups error:', error);
        res.status(500).json({ message: 'Server error fetching groups' });
    }
};

const getAllLoans = async (req, res) => {
    try {
        const loans = [
            {
                id: 1,
                user_name: 'Alice Member',
                amount: 10000,
                reason: 'School Fees',
                status: 'approved',
                created_at: new Date()
            }
        ];

        res.json({ loans });
    } catch (error) {
        console.error('Loans error:', error);
        res.status(500).json({ message: 'Server error fetching loans' });
    }
};

module.exports = {
    getDashboard,
    getAllUsers,
    createChief,
    deleteChief,
    getAllGroups,
    getAllLoans
};
