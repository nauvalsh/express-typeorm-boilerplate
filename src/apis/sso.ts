import 'dotenv/config';

import axios, { AxiosPromise } from 'axios';

const ssoEnv = {
  grantType: 'authorization_code',
  ssoUrl: process.env.SSO_URL,
  redirectUri: process.env.SSO_REDIRECT_URI,
  state: process.env.SSO_STATE,
  clientId: process.env.SSO_CLIENT,
  clientSecret: process.env.SSO_SECRET,
  auth: {
    username: process.env.SSO_CLIENT,
    password: process.env.SSO_SECRET,
  },
};

export const exchangeTokenSso = async (code: string): Promise<AxiosPromise> => {
  try {
    const getToken = await axios.post(
      ssoEnv.ssoUrl + '/oauth/token',
      new URLSearchParams({
        grant_type: ssoEnv.grantType,
        code,
        redirect_uri: ssoEnv.redirectUri,
        state: ssoEnv.state,
        client_id: ssoEnv.clientId,
        client_secret: ssoEnv.clientSecret,
      }),
      {
        auth: ssoEnv.auth,
      },
    );

    return getToken;
  } catch (e) {
    return e.response;
  }
};

const APISSO = {
  exchangeTokenSso,
};

export default APISSO;
