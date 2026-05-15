// Demo users for in-memory authentication
const demoUsers = [
    {
        id: 1,
        full_name: 'System Admin',
        email: 'admin@ikibina.com',
        phone: '0788000001',
        password: '123456',
        role: 'admin',
        status: 'active',
        created_at: new Date()
    },
    {
        id: 2,
        full_name: 'Chief Jean Claude',
        email: 'chief@ikibina.com',
        phone: '0788000002',
        password: '123456',
        role: 'chief',
        status: 'active',
        created_at: new Date()
    },
    {
        id: 3,
        full_name: 'Alice Member',
        email: 'alice@ikibina.com',
        phone: '0788000003',
        password: '123456',
        role: 'member',
        status: 'active',
        created_at: new Date()
    }
];

module.exports = { demoUsers };
