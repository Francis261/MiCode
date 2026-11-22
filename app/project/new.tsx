import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Lock, Globe2, Sparkles, ArrowUp, GitBranch, Check } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { useWorkspace } from '@/lib/workspace';
import { createGitHubRepository, getGitHubToken } from '@/lib/github';
import { installRenewableRuntime } from '@/lib/agent';

export default function NewProject() {
  const params = useLocalSearchParams<{ prompt?: string }>();
  const { createProject, linkRepository } = useWorkspace();
  const [name, setName] = useState('Untitled project');
  const [prompt, setPrompt] = useState(params.prompt || '');
  const [visibility, setVisibility] = useState<'Private' | 'Public'>('Private');
  const [createOnGitHub, setCreateOnGitHub] = useState(false);
  const [installAgent, setInstallAgent] = useState(false);
  const [githubConnected, setGitBranchConnected] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getGitHubToken().then(token=>setGitBranchConnected(!!token)).catch(()=>setGitBranchConnected(false)); }, []);

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Project name required', 'Enter a name for your project to continue.'); return; }
    if (saving) return;
    setSaving(true);
    try {
      let remoteRepo = null;
      if (createOnGitHub) remoteRepo = await createGitHubRepository({ name: name.trim(), description: prompt.trim(), isPrivate: visibility === 'Private' });
      const project = await createProject({ name: name.trim(), prompt: prompt.trim(), visibility });
      if (remoteRepo) {
        await linkRepository(project.id, remoteRepo);
        if (installAgent) await installRenewableRuntime(remoteRepo.full_name);
      }
      router.replace({ pathname: '/project/[id]', params: { id: project.id } });
    } catch (error) {
      Alert.alert('Could not create project', error instanceof Error ? error.message : 'Please try again. If GitHub created the repository, it will remain in your account.');
    } finally { setSaving(false); }
  };

  return <Screen>
    <Pressable onPress={() => router.back()} style={s.back}><ArrowLeft size={19} color={colors.text}/><Text style={s.backText}>Back</Text></Pressable>
    <View style={s.heroIcon}><Sparkles size={24} color={colors.primary}/></View>
    <Text style={s.title}>Start a new project</Text>
    <Text style={s.subtitle}>Give your idea a name and tell MiCode what to build.</Text>
    <Text style={s.label}>PROJECT NAME</Text>
    <TextInput value={name} onChangeText={setName} maxLength={60} placeholder="My awesome project" style={s.field}/>
    <Text style={s.label}>WHAT DO YOU WANT TO BUILD?</Text>
    <TextInput value={prompt} onChangeText={setPrompt} multiline placeholder="Describe your app, website, or feature..." placeholderTextColor="#A5A7B2" style={[s.field,s.prompt]}/>
    <Text style={s.label}>REPOSITORY VISIBILITY</Text>
    <View style={s.visibility}>{[{name:'Private' as const,icon:Lock},{name:'Public' as const,icon:Globe2}].map(v=><Pressable key={v.name} onPress={()=>setVisibility(v.name)} style={[s.choice,visibility===v.name&&s.choiceActive]}><v.icon size={16} color={visibility===v.name?colors.primary:colors.muted}/><Text style={[s.choiceText,visibility===v.name&&{color:colors.primary}]}>{v.name}</Text></Pressable>)}</View>
    <Pressable style={[s.githubOption,!githubConnected&&s.disabled]} onPress={()=>{if(!githubConnected){Alert.alert('Connect GitHub first','Add your GitHub personal access token in Settings before creating a remote repository.');return;}setCreateOnGitHub(!createOnGitHub);}}>
      <View style={[s.checkbox,createOnGitHub&&s.checkboxActive]}>{createOnGitHub?<Check size={13} color="#fff"/>:null}</View><View style={{flex:1}}><Text style={s.githubTitle}>Create a GitHub repository</Text><Text style={s.githubSub}>{githubConnected?'Create and connect a remote repository automatically.':'Connect GitHub in Settings to enable this option.'}</Text></View><GitBranch size={19} color={colors.primary}/>
    </Pressable>
    {createOnGitHub ? <Pressable style={s.githubOption} onPress={()=>setInstallAgent(!installAgent)}>
      <View style={[s.checkbox,installAgent&&s.checkboxActive]}>{installAgent?<Check size={13} color="#fff"/>:null}</View>
      <View style={{flex:1}}><Text style={s.githubTitle}>Install renewable MiCode Agent</Text><Text style={s.githubSub}>Add the GitHub Actions workflow and MiCode runtime files. The agent uses a 4h 30m handoff interval and checkpoints work to a dedicated branch.</Text></View>
      <Sparkles size={18} color={colors.primary}/>
    </Pressable> : null}
    <View style={s.note}><GitBranch size={17} color={colors.primary}/><Text style={s.noteText}>{createOnGitHub?(installAgent?'You authorize MiCode to add its workflow and runtime files to this repository. GitHub token needs Contents: write and Workflows: write.':'MiCode will create a GitHub repository and link it. Agent installation is optional and requires your explicit approval.'):'This creates a local project on this device. You can import or connect a GitHub repository later.'}</Text></View>
    <Pressable disabled={saving} style={[s.button,saving&&{opacity:.65}]} onPress={submit}>{saving?<ActivityIndicator color="#fff"/>:<Sparkles size={17} color="#fff"/>}<Text style={s.buttonText}>{saving?'Creating project…':'Create project'}</Text><ArrowUp size={17} color="#fff"/></Pressable>
  </Screen>;
}

const s=StyleSheet.create({
  back:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:28},backText:{fontSize:13,fontWeight:'700',color:colors.text},
  heroIcon:{width:50,height:50,borderRadius:17,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center',marginBottom:17},
  title:{fontSize:28,fontWeight:'800',letterSpacing:-.9,color:colors.text},subtitle:{fontSize:13,color:colors.muted,lineHeight:20,marginTop:7,marginBottom:27},
  label:{fontSize:10,fontWeight:'800',letterSpacing:1,color:colors.muted,marginBottom:9,marginTop:17},
  field:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:13,padding:14,fontSize:13,color:colors.text},
  prompt:{height:125,textAlignVertical:'top',lineHeight:21},visibility:{flexDirection:'row',gap:10},
  choice:{flex:1,height:45,borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:'#fff',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  choiceActive:{borderColor:colors.primary,backgroundColor:colors.primarySoft},choiceText:{fontSize:12,fontWeight:'700',color:colors.muted},
  githubOption:{flexDirection:'row',alignItems:'center',gap:11,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:13,padding:13,marginTop:20},disabled:{opacity:.55},
  checkbox:{width:20,height:20,borderRadius:6,borderWidth:1.5,borderColor:colors.subtle,alignItems:'center',justifyContent:'center'},checkboxActive:{backgroundColor:colors.primary,borderColor:colors.primary},
  githubTitle:{fontSize:12,fontWeight:'800',color:colors.text},githubSub:{fontSize:10,color:colors.muted,marginTop:4,lineHeight:15},
  note:{flexDirection:'row',gap:10,backgroundColor:'#F0EEFF',padding:13,borderRadius:13,marginTop:14},noteText:{flex:1,fontSize:11,color:'#625B91',lineHeight:17},
  button:{height:52,backgroundColor:colors.primary,borderRadius:15,marginTop:22,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},buttonText:{fontSize:13,fontWeight:'800',color:'#fff'}
});
