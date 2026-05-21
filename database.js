import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

let pool;

function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            console.error('DATABASE_URL environment variable is not set');
            throw new Error('DATABASE_URL environment variable is required');
        }
        pool = new Pool({ connectionString });
    }
    return pool;
}

export async function initializeDatabase() {
    const client = await getPool().connect();

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const defaultUsers = [
            { username: 'admin', password: '123abc' },
            { username: 'user1', password: '123abc' },
            { username: 'user2', password: '123abc' }
        ];

        for (const user of defaultUsers) {
            const hashedPassword = bcrypt.hashSync(user.password, 10);
            try {
                await client.query(
                    'INSERT INTO users (username, password) VALUES ($1, $2)',
                    [user.username, hashedPassword]
                );
                console.log(`✅ 创建用户: ${user.username}`);
            } catch (err) {
                if (err.code === '23505') {
                    console.log(`ℹ️ 用户已存在: ${user.username}`);
                } else {
                    throw err;
                }
            }
        }

        console.log('✅ 数据库初始化完成');
    } finally {
        client.release();
    }
}

export async function getUserByUsername(username) {
    const result = await getPool().query(
        'SELECT * FROM users WHERE username = $1',
        [username]
    );
    return result.rows[0];
}

export async function verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
}

export default { initializeDatabase, getUserByUsername, verifyPassword };
