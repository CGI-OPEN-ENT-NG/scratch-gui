const generateRandomStr = (length = 64) => {
    let randomStr = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        randomStr += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return randomStr;
};

const getCookie = name => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
};

const getSessionCookie = () => getCookie('sessionId');

const setSessionCookie = (sessionId, expireDate = null) => {
    if (expireDate === null) {
        expireDate = new Date();
        expireDate.setDate(expireDate.getDay() + 1);
    }

    document.cookie = `sessionId=${sessionId}; ${expireDate.toUTCString()} ; path=/`;
};

export {generateRandomStr, getCookie, getSessionCookie, setSessionCookie};
