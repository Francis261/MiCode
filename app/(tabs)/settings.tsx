import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckCircle2, ChevronRight, CircleHelp, Cpu, ExternalLink, GitBranch, KeyRound, LockKeyhole, ShieldCheck, Bell, SlidersHorizontal, UserRound, X, BookOpen, Unplug } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { Screen } from '@/components/Screen';
import { saveAgentConfig, checkAgentServer, getAgentConfig } from '@/lib/agent';
import { Brand } from '@/components/Brand';
import { colors } from '@/constants/theme';

const TOKEN_KEY = 'micode.github.pat.v1';
const USER_KEY = 'micode.github.user.v1';
type GitHubUser = { login: string; avatar_url?: string; name?: string | null };

async function validateToken(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.trim()}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('GitHub rejected this token. Check that it is correct, active, and not expired.');
    if (response.status === 403) throw new Error('GitHub denied this request. Check token permissions and organization approval requirements.');
    throw new Error(`GitHub returned an error (${response.status}). Please try again.`);
  }
  return response.json() as Promise<GitHubUser>;
}

const groups = [
  { title: 'Connections', rows: [{ name: 'MiCode agent server', desc: 'Connect the secure coding backend', icon: Cpu }, { name: 'AI providers', desc: 'Provider configured on the backend', icon: KeyRound }, { name: 'Execution environments', desc: 'Docker-isolated project runner', icon: Cpu }] },
  { title: 'Preferences', rows: [{ name: 'Appearance', desc: 'Theme and editor preferences', icon: SlidersHorizontal }, { name: 'Notifications', desc: 'Agent and project updates', icon: Bell }, { name: 'Security', desc: 'Sessions and credential controls', icon: ShieldCheck }] },
  { title: 'Support', rows: [{ name: 'Help center', desc: 'Guides and documentation', icon: CircleHelp }] },
];

export default function Settings() {
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [modal, setModal] = useState<'connect' | 'guide' | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agentModal, setAgentModal] = useState(false);
  const [agentUrl, setAgentUrl] = useState('');
  const [agentToken, setAgentToken] = useState('');
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);

  useEffect(() => {
    getAgentConfig().then(c=>{setAgentUrl(c.baseUrl);setAgentConnected(!!c.baseUrl&&!!c.token);}).catch(()=>{});
    let alive = true;
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        const cachedUser = await SecureStore.getItemAsync(USER_KEY);
        if (cachedUser && alive) setGithubUser(JSON.parse(cachedUser) as GitHubUser);
        if (saved) {
          try {
            const user = await validateToken(saved);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
            if (alive) setGithubUser(user);
          } catch (error) {
            // Keep the saved token if GitHub is temporarily unreachable.
            if (error instanceof Error && (error.message.startsWith('GitHub rejected') || error.message.startsWith('GitHub denied'))) {
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              await SecureStore.deleteItemAsync(USER_KEY);
              if (alive) setGithubUser(null);
            }
          }
        }
      } catch {
        // Secure storage may be unavailable on web or an unsupported device.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const connect = async () => {
    if (Platform.OS === 'web') { Alert.alert('Use the MiCode mobile app', 'GitHub tokens are stored with native secure storage. Connect GitHub from the Android or iOS app, not a browser.'); return; }
    const value = token.trim();
    if (!value) {
      Alert.alert('Token required', 'Paste your GitHub personal access token first.');
      return;
    }
    setBusy(true);
    try {
      const user = await validateToken(value);
      await SecureStore.setItemAsync(TOKEN_KEY, value);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      setGithubUser(user);
      setToken('');
      setModal(null);
      Alert.alert('GitHub connected', `Successfully connected @${user.login}.`);
    } catch (error) {
      Alert.alert('Could not connect GitHub', error instanceof Error ? error.message : 'Please check the token and try again.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => Alert.alert('Disconnect GitHub?', 'MiCode will delete the saved token from this device. You can revoke the token separately in GitHub settings.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Disconnect', style: 'destructive', onPress: async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      setGithubUser(null);
    } },
  ]);

  const saveAgent = async () => {setAgentBusy(true);try{await saveAgentConfig(agentUrl,agentToken);await checkAgentServer();setAgentConnected(true);setAgentToken('');setAgentModal(false);Alert.alert('Agent server connected','MiCode successfully reached your backend. AI features still require a provider API key on the server.');}catch(e){Alert.alert('Could not connect agent server',e instanceof Error?e.message:'Check your URL and server token.');}finally{setAgentBusy(false);}};

  const openGitHub = (url: string) => {
    // The guide provides a copyable URL; use the system browser through a standard link action.
    import('expo-linking').then(({ openURL }) => openURL(url));
  };

  return <Screen>
    <View style={s.brand}><Brand /></View>
    <Text style={s.kicker}>PREFERENCES</Text>
    <Text style={s.title}>Settings</Text>
    <View style={s.profile}><View style={s.avatar}><UserRound size={23} color={colors.primary}/></View><View style={{flex:1}}><Text style={s.profileName}>Your MiCode account</Text><Text style={s.profileSub}>Personal workspace</Text></View><ChevronRight size={18} color={colors.muted}/></View>

    <View style={s.group}>
      <Text style={s.groupTitle}>CONNECTIONS</Text>
      <View style={s.list}>
        <Pressable style={s.row} onPress={()=>{setModal('connect');}}>
          <View style={s.rowIcon}><GitBranch size={19} color={colors.primary}/></View>
          <View style={{flex:1}}>
            <Text style={s.rowTitle}>GitHub account</Text>
            <Text style={s.rowDesc}>{Platform.OS === 'web' ? 'Connect GitHub in the Android or iOS app' : loading ? 'Checking connection…' : githubUser ? `Connected as @${githubUser.login}` : 'Add a personal access token'}</Text>
          </View>
          {githubUser ? <CheckCircle2 size={18} color={colors.green}/> : <ChevronRight size={17} color="#B5B7C2"/>}
        </Pressable>
        {githubUser ? <Pressable style={s.disconnect} onPress={disconnect}><Unplug size={14} color={'#C74747'}/><Text style={s.disconnectText}>Disconnect GitHub</Text></Pressable> : null}
        <Pressable style={s.helpRow} onPress={()=>setModal('guide')}><BookOpen size={15} color={colors.primary}/><Text style={s.helpText}>How to create a token and choose permissions</Text><ChevronRight size={15} color={colors.muted}/></Pressable>
      </View>
    </View>

    {groups.map(g=><View key={g.title} style={s.group}><Text style={s.groupTitle}>{g.title.toUpperCase()}</Text><View style={s.list}>{g.rows.map(r=><Pressable key={r.name} style={s.row} onPress={()=>r.name==='MiCode agent server'?setAgentModal(true):Alert.alert(r.name, 'Configure provider credentials on the secure agent server.')}><View style={s.rowIcon}><r.icon size={18} color={colors.primary}/></View><View style={{flex:1}}><Text style={s.rowTitle}>{r.name}</Text><Text style={s.rowDesc}>{r.desc}</Text></View><ChevronRight size={17} color="#B5B7C2"/></Pressable>)}</View></View>)}
    <Text style={s.version}>MiCode Preview · v0.1.0</Text>

    <Modal visible={agentModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setAgentModal(false)}><View style={s.modalRoot}><View style={s.modalHeader}><View><Text style={s.modalKicker}>AGENT BACKEND</Text><Text style={s.modalTitle}>Connect MiCode server</Text></View><Pressable style={s.close} onPress={()=>setAgentModal(false)}><X size={19} color={colors.text}/></Pressable></View><Text style={s.modalIntro}>Enter the HTTPS URL of your deployed MiCode agent server and its access token. Keep the token private.</Text><Text style={s.label}>SERVER URL</Text><TextInput value={agentUrl} onChangeText={setAgentUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://agent.example.com" style={s.tokenInput}/><Text style={[s.label,{marginTop:18}]}>SERVER ACCESS TOKEN</Text><TextInput value={agentToken} onChangeText={setAgentToken} secureTextEntry autoCapitalize="none" placeholder="Paste MICODE_SERVER_TOKEN" style={s.tokenInput}/><View style={s.securityNote}><LockKeyhole size={16} color={colors.green}/><Text style={s.securityText}>The server token is stored in device secure storage. AI provider keys belong on the backend, never in the app.</Text></View><Pressable disabled={agentBusy||!agentUrl.trim()||!agentToken.trim()} style={[s.primaryButton,(agentBusy||!agentUrl.trim()||!agentToken.trim())&&{opacity:.5}]} onPress={()=>void saveAgent()}>{agentBusy?<ActivityIndicator color="#fff"/>:<Cpu size={17} color="#fff"/>}<Text style={s.primaryButtonText}>{agentBusy?'Testing connection…':'Save and test connection'}</Text></Pressable><Text style={s.footnote}>{agentConnected?'A server URL is saved. Enter the token again to rotate or reconnect it.':'Deploy agent-server and configure its environment before connecting.'}</Text></View></Modal>

    <Modal visible={modal==='connect'} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setModal(null)}>
      <View style={s.modalRoot}>
        <View style={s.modalHeader}><View><Text style={s.modalKicker}>GITHUB CONNECTION</Text><Text style={s.modalTitle}>Add access token</Text></View><Pressable style={s.close} onPress={()=>setModal(null)}><X size={19} color={colors.text}/></Pressable></View>
        <Text style={s.modalIntro}>Paste a GitHub Personal Access Token (PAT). MiCode will validate it and save it securely on this device.</Text>
        <Text style={s.label}>PERSONAL ACCESS TOKEN</Text>
        <View style={s.tokenInput}><TextInput value={token} onChangeText={setToken} placeholder="github_pat_…" placeholderTextColor="#A5A8B5" secureTextEntry={!showToken} autoCapitalize="none" autoCorrect={false} style={s.tokenField}/><Pressable onPress={()=>setShowToken(!showToken)}><Text style={s.showText}>{showToken?'Hide':'Show'}</Text></Pressable></View>
        <View style={s.securityNote}><LockKeyhole size={16} color={colors.green}/><Text style={s.securityText}>Stored using device secure storage. Your token is not displayed after saving and is never written to app logs.</Text></View>
        <Pressable style={s.guideLink} onPress={()=>setModal('guide')}><CircleHelp size={16} color={colors.primary}/><Text style={s.guideLinkText}>Where do I get a token, and what permissions do I need?</Text></Pressable>
        <Pressable disabled={busy||!token.trim()} onPress={connect} style={[s.primaryButton,(busy||!token.trim())&&{opacity:.5}]}>{busy?<ActivityIndicator color="#fff"/>:<GitBranch size={17} color="#fff"/>}<Text style={s.primaryButtonText}>{busy?'Validating with GitHub…':'Validate and connect'}</Text></Pressable>
        <Text style={s.footnote}>Use a fine-grained token and limit it to only the repositories MiCode needs. You can revoke it anytime from GitHub.</Text>
      </View>
    </Modal>

    <Modal visible={modal==='guide'} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setModal(null)}>
      <ScrollView style={s.modalRoot} contentContainerStyle={{paddingBottom:36}}>
        <View style={s.modalHeader}><View><Text style={s.modalKicker}>SETUP GUIDE</Text><Text style={s.modalTitle}>Create a GitHub token</Text></View><Pressable style={s.close} onPress={()=>setModal(null)}><X size={19} color={colors.text}/></Pressable></View>
        <Text style={s.guideLead}>A fine-grained personal access token is recommended. It lets you select specific repositories and grant only the permissions MiCode needs.</Text>
        <Pressable style={s.linkButton} onPress={()=>openGitHub('https://github.com/settings/personal-access-tokens/new')}><ExternalLink size={16} color="#fff"/><Text style={s.linkButtonText}>Open GitHub token creation</Text></Pressable>
        <Text style={s.stepTitle}>1. Configure the token</Text>
        <Text style={s.bodyText}>Give it a descriptive name such as “MiCode”, choose an expiry date, and select the account owner.</Text>
        <Text style={s.stepTitle}>2. Choose repository access</Text>
        <Text style={s.bodyText}>Choose “Only select repositories” and select the repositories you want MiCode to work with. Avoid granting access to every repository unless you really need it.</Text>
        <Text style={s.stepTitle}>3. Grant repository permissions</Text>
        <View style={s.permission}><Text style={s.permissionName}>Metadata</Text><Text style={s.permissionValue}>Read-only · Required by GitHub</Text><Text style={s.permissionDesc}>Allows GitHub to identify the selected repositories.</Text></View>
        <View style={s.permission}><Text style={s.permissionName}>Contents</Text><Text style={s.permissionValue}>Read and write</Text><Text style={s.permissionDesc}>Lets MiCode browse, create, and update files in selected repositories.</Text></View>
        <View style={s.permission}><Text style={s.permissionName}>Pull requests</Text><Text style={s.permissionValue}>Read and write</Text><Text style={s.permissionDesc}>Required to list open pull requests and create new pull requests from a pushed branch.</Text></View>
        <View style={s.permission}><Text style={s.permissionName}>Actions</Text><Text style={s.permissionValue}>Read and write</Text><Text style={s.permissionDesc}>Required to list workflows and runs, and dispatch a workflow run.</Text></View>
        <View style={s.permission}><Text style={s.permissionName}>Workflows</Text><Text style={s.permissionValue}>Write</Text><Text style={s.permissionDesc}>Required to install or update MiCode&apos;s GitHub Actions workflow file in the repository.</Text></View>
        <View style={s.permission}><Text style={s.permissionName}>Repository creation</Text><Text style={s.permissionValue}>Write · Optional</Text><Text style={s.permissionDesc}>Only needed if you want MiCode to create new repositories in your GitHub account. Existing repository import and file editing do not need this permission.</Text></View>
        <View style={s.warning}><ShieldCheck size={17} color={colors.orange}/><Text style={s.warningText}>Do not grant broad Administration, Secrets, Actions, Pull requests, or organization permissions. Repository creation: write is the narrow optional permission for the create-repository action. Add other permissions only when you enable a feature that needs them.</Text></View>
        <Text style={s.stepTitle}>4. Generate and copy</Text>
        <Text style={s.bodyText}>Click “Generate token” and copy it immediately. GitHub will not show the full token again. Return to MiCode Settings, paste it, and tap “Validate and connect”. Never share the token in chat or screenshots.</Text>
        <Text style={s.stepTitle}>If you use a classic token</Text>
        <Text style={s.bodyText}>Use the repo scope for private repository access and workflow only if MiCode must edit workflow files or manage workflows. Avoid admin:org, delete_repo, and other broad scopes. Fine-grained tokens are preferred.</Text>
        <Pressable style={s.primaryButton} onPress={()=>setModal('connect')}><KeyRound size={17} color="#fff"/><Text style={s.primaryButtonText}>I have a token — add it</Text></Pressable>
      </ScrollView>
    </Modal>
  </Screen>;
}

const s=StyleSheet.create({
  brand:{marginBottom:28},kicker:{fontSize:10,fontWeight:'800',letterSpacing:1.5,color:colors.primary,marginBottom:7},title:{fontSize:30,fontWeight:'800',letterSpacing:-1,color:colors.text},
  profile:{marginTop:20,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:17,padding:14,flexDirection:'row',alignItems:'center',gap:12},
  avatar:{width:43,height:43,borderRadius:15,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},profileName:{fontSize:13,fontWeight:'800',color:colors.text},profileSub:{fontSize:11,color:colors.muted,marginTop:4},
  group:{marginTop:25},groupTitle:{fontSize:10,fontWeight:'800',letterSpacing:1.1,color:colors.muted,marginBottom:10},
  list:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:17,overflow:'hidden'},
  row:{flexDirection:'row',alignItems:'center',gap:11,padding:13,borderBottomWidth:1,borderBottomColor:'#F0F0F4'},rowIcon:{width:36,height:36,borderRadius:11,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},
  rowTitle:{fontSize:13,fontWeight:'700',color:colors.text},rowDesc:{fontSize:10,color:colors.muted,marginTop:3},version:{textAlign:'center',fontSize:10,color:colors.subtle,marginTop:28,marginBottom:8},
  disconnect:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:11},disconnectText:{fontSize:11,fontWeight:'700',color:'#C74747'},
  helpRow:{flexDirection:'row',alignItems:'center',gap:8,padding:13,borderTopWidth:1,borderTopColor:'#F0F0F4'},helpText:{flex:1,fontSize:11,color:colors.primary,fontWeight:'700'},
  modalRoot:{flex:1,backgroundColor:colors.background,padding:22,paddingTop:24},modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18},
  modalKicker:{fontSize:9,fontWeight:'800',letterSpacing:1.3,color:colors.primary,marginBottom:6},modalTitle:{fontSize:24,fontWeight:'800',letterSpacing:-.7,color:colors.text},
  close:{width:36,height:36,borderRadius:12,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border},
  modalIntro:{fontSize:12,color:colors.muted,lineHeight:19,marginBottom:23},label:{fontSize:10,fontWeight:'800',letterSpacing:1,color:colors.muted,marginBottom:9},
  tokenInput:{height:52,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:13,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:8},
  tokenField:{flex:1,fontSize:13,color:colors.text},showText:{fontSize:11,fontWeight:'800',color:colors.primary,padding:6},
  securityNote:{flexDirection:'row',gap:9,backgroundColor:'#EAF7F0',padding:12,borderRadius:12,marginTop:14},securityText:{flex:1,fontSize:10,color:'#356B50',lineHeight:16},
  guideLink:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:17},guideLinkText:{fontSize:11,color:colors.primary,fontWeight:'700',flex:1},
  primaryButton:{height:51,backgroundColor:colors.primary,borderRadius:14,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,marginTop:16},
  primaryButtonText:{fontSize:12,fontWeight:'800',color:'#fff'},footnote:{fontSize:10,color:colors.muted,lineHeight:16,textAlign:'center',marginTop:14},
  guideLead:{fontSize:12,color:colors.muted,lineHeight:19,marginBottom:14},linkButton:{height:44,backgroundColor:'#24292F',borderRadius:12,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginBottom:18},
  linkButtonText:{fontSize:11,fontWeight:'800',color:'#fff'},stepTitle:{fontSize:13,fontWeight:'800',color:colors.text,marginTop:17,marginBottom:6},
  bodyText:{fontSize:11,color:colors.muted,lineHeight:18},permission:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:12,padding:12,marginTop:8},
  permissionName:{fontSize:12,fontWeight:'800',color:colors.text},permissionValue:{fontSize:10,fontWeight:'800',color:colors.primary,marginTop:4},permissionDesc:{fontSize:10,color:colors.muted,lineHeight:15,marginTop:5},
  warning:{flexDirection:'row',gap:9,backgroundColor:'#FFF4E6',padding:12,borderRadius:12,marginTop:14},warningText:{flex:1,fontSize:10,color:'#805A2D',lineHeight:16}
});
