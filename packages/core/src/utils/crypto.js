import argon2 from 'react-native-argon2';
export const hashPIN = async (PIN, salt) => {
    try {
        const result = await argon2(PIN, salt, {});
        const { rawHash } = result;
        return rawHash;
    }
    catch (error) {
        throw new Error(`Error generating hash for PIN ${String(error?.message ?? error)}`);
    }
};
