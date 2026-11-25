import {useCallback, useEffect, useState} from 'react';
import {api, clearSession, saveSession, savedPerson, token} from './api.js';

// One session for everybody. The role comes from the server's /me document;
// this hook only keeps it and exposes sign-in/out actions.
export function useSession() {
  const [state, setState] = useState({status: token() ? 'loading' : 'guest', person: savedPerson(), caps: null});

  const load = useCallback(async () => {
    if (!token()) { setState({status: 'guest', person: null, caps: null}); return null; }
    setState(s => ({...s, status: 'loading'}));
    try {
      const me = await api.me();
      setState({status: 'ready', person: me.person, caps: me});
      return me;
    } catch (e) {
      if (e.status === 401 || e.status === 428) {
        clearSession();
        setState({status: 'guest', person: null, caps: null, error: e.code === 'profile_missing' ? 'profile_missing' : null});
        return null;
      }
      // A network or server problem must not silently sign the person out.
      setState(s => ({...s, status: s.person ? 'ready' : 'guest', error: e.message}));
      return null;
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const signIn = useCallback(async (email, password) => {
    const result = await api.login(email, password);
    saveSession({token: result.token, person: result.person});
    const me = await api.me();
    setState({status: 'ready', person: me.person, caps: me});
    return {result, me, home: result.home};
  }, []);


  const signOut = useCallback(async () => {
    await api.logout();
    clearSession();
    setState({status: 'guest', person: null, caps: null});
  }, []);

  const refresh = useCallback(async () => {
    const me = await api.me();
    setState(s => ({...s, caps: me, person: me.person}));
    return me;
  }, []);

  return {...state, signIn, signOut, refresh};
}
