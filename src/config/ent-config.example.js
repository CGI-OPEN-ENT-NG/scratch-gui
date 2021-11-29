export default class EntConfig {
    static AUTH_BASIC_LOGIN = new EntConfig('login');
    static AUTH_BASIC_PASSWORD = new EntConfig('password');
    static ENT_USERNAME = new EntConfig('DOE John');
    static ENT_USER_ID = new EntConfig('123456789');
    constructor (name) {
        this.name = name;
    }
}
