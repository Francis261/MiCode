import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Sparkles, Terminal, FileCode2, Eye, GitBranch, MoreHorizontal, CircleDot, Bot, Folder, File, RefreshCw, ChevronRight, X, ExternalLink } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { useWorkspace } from '@/lib/workspace';
import { createAgentSession, streamAgent, runTerminal, buildPreview, publishAgentChanges, listPullRequests, createPullRequest, listWorkflows, dispatchWorkflow, listWorkflowRuns } from '@/lib/agent';
import { listGitHubRepositories, listRepositoryContents, readRepositoryFile, saveRepositoryFile, GitHubContent, GitHubRepository } from '@/lib/github';

export default function ProjectWorkspace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { projects, addActivity, deleteProject, linkRepository } = useWorkspace();
  const project = useMemo(() => projects.find(item => item.id === id), [projects, id]);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('Preview');
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<GitHubContent[]>([]);
  const [path, setPath] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState('');
  const [openedFile, setOpenedFile] = useState<{path:string;content:string}|null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [repoPicker, setRepoPicker] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentOutput, setAgentOutput] = useState('');
  const [agentStatus, setAgentStatus] = useState('');
  const [terminalCommand, setTerminalCommand] = useState('pwd');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalBusy, setTerminalBusy] = useState(false);
  const [prItems, setPrItems] = useState<any[]>([]);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prHead, setPrHead] = useState('');
  const [prBase, setPrBase] = useState('main');
  const [workflowItems, setWorkflowItems] = useState<any[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([]);
  const [workflowRef, setWorkflowRef] = useState('main');
  const [previewOutput, setPreviewOutput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishedBranch, setPublishedBranch] = useState('');

  const repoParts = project?.repo?.split('/') || [];
  const owner = repoParts.length === 2 ? repoParts[0] : '';
  const repoName = repoParts.length === 2 ? repoParts[1] : '';

  const loadFiles = async (nextPath = path) => {
    if (!owner || !repoName) return;
    setLoadingFiles(true);
    setFileError('');
    try {
      const items = await listRepositoryContents(owner, repoName, nextPath);
      setFiles(items.sort((a,b)=>a.type===b.type?a.name.localeCompare(b.name):a.type==='dir'?-1:1));
      setPath(nextPath);
    } catch (error) { setFileError(error instanceof Error ? error.message : 'Could not load repository files.'); }
    finally { setLoadingFiles(false); }
  };

  const openRepoPicker = async () => {
    setRepoPicker(true);
    setLoadingRepos(true);
    try { setAvailableRepos(await listGitHubRepositories()); }
    catch (error) { Alert.alert('Could not load repositories', error instanceof Error ? error.message : 'Check your GitHub connection.'); }
    finally { setLoadingRepos(false); }
  };

  const attachRepo = async (repo: GitHubRepository) => {
    if (!project) return;
    try { await linkRepository(project.id, repo); setRepoPicker(false); setPath(''); setFiles([]); }
    catch (error) { Alert.alert('Could not connect repository', error instanceof Error ? error.message : 'Please try again.'); }
  };

  const openFile = async (file: GitHubContent) => {
    if (file.type === 'dir') { await loadFiles(file.path); return; }
    setLoadingFile(true);
    try {
      const content = await readRepositoryFile(owner, repoName, file.path);
      setOpenedFile({path:file.path,content});
    } catch (error) { Alert.alert('Could not open file', error instanceof Error ? error.message : 'Try again.'); }
    finally { setLoadingFile(false); }
  };

  const ensureSession = async () => {if(sessionId)return sessionId;if(!project?.repo)throw new Error('Connect a GitHub repository first.');const created=await createAgentSession(project.repo);setSessionId(created.sessionId);return created.sessionId;};

  const saveRequest = async () => {
    const request = message.trim();
    if (!request || saving) return;
    setSaving(true);
    try {
      setAgentBusy(true);setAgentOutput('');setAgentStatus('Connecting to the coding agent…');
      const sid=await ensureSession();
      await streamAgent(sid,request,(event,data)=>{if(event==='delta')setAgentOutput(current=>current+data.text);else if(event==='status')setAgentStatus(data.message);else if(event==='tool')setAgentStatus((data.ok?'Ran ':'Tool failed: ')+data.name);else if(event==='error'){setAgentStatus(data.error);throw new Error(data.error);}else if(event==='done')setAgentStatus('Agent completed');});
      await addActivity({ title: 'AI agent completed a task', detail: request, projectId: project?.id, projectName: project?.name || 'Unknown project', kind: 'updated' });
      setMessage('');
    } catch (error) { Alert.alert('Agent request failed', error instanceof Error?error.message:'Please check your backend configuration.'); }
    finally { setSaving(false);setAgentBusy(false); }
  };

  const publishChanges = async () => {setPublishing(true);try{const sid=await ensureSession();const result=await publishAgentChanges(sid);setPublishedBranch(result.branch);setPrHead(result.branch);Alert.alert('Changes pushed to GitHub',`Branch ${result.branch} is ready. Open Pull requests to create a PR.`);}catch(e){Alert.alert('Could not publish changes',e instanceof Error?e.message:'Check GitHub Contents permissions and branch protection.');}finally{setPublishing(false);}};

  const executeTerminal = async () => {if(!terminalCommand.trim()||terminalBusy)return;setTerminalBusy(true);try{const sid=await ensureSession();const result=await runTerminal(sid,terminalCommand.trim());setTerminalOutput('$ '+terminalCommand+'\\n'+result.output);}catch(e){setTerminalOutput(e instanceof Error?e.message:'Terminal command failed.');}finally{setTerminalBusy(false);}};
  const loadPullRequests = async () => {if(!project?.repo)return;try{setPrItems(await listPullRequests(project.repo));}catch(e){Alert.alert('Pull requests unavailable',e instanceof Error?e.message:'Check backend and GitHub token.');}};
  const submitPullRequest = async () => {if(!project?.repo||!prTitle.trim()||!prHead.trim()||!prBase.trim())return;try{const pr=await createPullRequest({repository:project.repo,title:prTitle,body:prBody,head:prHead,base:prBase});Alert.alert('Pull request created',pr.html_url);setPrTitle('');await loadPullRequests();}catch(e){Alert.alert('Could not create pull request',e instanceof Error?e.message:'Check GitHub permissions and branch names.');}};
  const loadActions = async () => {if(!project?.repo)return;try{const [w,r]=await Promise.all([listWorkflows(project.repo),listWorkflowRuns(project.repo)]);setWorkflowItems(w.workflows||[]);setWorkflowRuns(r.workflow_runs||[]);}catch(e){Alert.alert('GitHub Actions unavailable',e instanceof Error?e.message:'Check token permissions.');}};
  const runWorkflow = async (workflowId:number) => {if(!project?.repo)return;try{await dispatchWorkflow({repository:project.repo,workflowId,ref:workflowRef});Alert.alert('Workflow dispatched','GitHub accepted the workflow run request. Refresh Actions to see its status.');await loadActions();}catch(e){Alert.alert('Could not dispatch workflow',e instanceof Error?e.message:'Check Actions permissions and workflow configuration.');}};
  const runBuild = async () => {try{const sid=await ensureSession();const result=await buildPreview(sid);setPreviewOutput(result.output+'\\n'+result.message);setPreviewUrl(result.previewUrl||'');if(result.previewUrl)await Linking.openURL(result.previewUrl);}catch(e){Alert.alert('Build failed',e instanceof Error?e.message:'Check your backend runner.');}};

  const saveOpenFile = async () => {
    if (!openedFile || !owner || !repoName || savingFile) return;
    setSavingFile(true);
    try {
      const result = await saveRepositoryFile(owner, repoName, openedFile.path, openedFile.content, `Update ${openedFile.path} via MiCode`);
      await addActivity({ title: 'GitHub file updated', detail: `Committed changes to ${openedFile.path} (${result.commit.sha.slice(0, 7)}).`, projectId: project?.id, projectName: project?.name, kind: 'updated' });
      setOpenedFile(null);
      await loadFiles(path);
      Alert.alert('Changes committed', 'Your file was updated on GitHub successfully.');
    } catch (error) { Alert.alert('Could not save file', error instanceof Error ? error.message : 'GitHub rejected the update.'); }
    finally { setSavingFile(false); }
  };

  const remove = () => Alert.alert('Delete project?', `“${project?.name || 'This project'}” will be removed from this device. Its GitHub repository will not be deleted.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { if (project) await deleteProject(project.id); router.back(); } },
  ]);

  if (!project) return <Screen><Pressable onPress={()=>router.back()} style={s.back}><ArrowLeft size={19} color={colors.text}/></Pressable><View style={s.empty}><Text style={s.emptyTitle}>Project not found</Text><Text style={s.emptyText}>This project may have been deleted from this device.</Text></View></Screen>;

  return <Screen contentStyle={s.content}>
    <View style={s.header}>
      <Pressable onPress={()=>router.back()} style={s.back}><ArrowLeft size={19} color={colors.text}/></Pressable>
      <View style={{flex:1}}><Text style={s.name}>{project.name}</Text><View style={s.branch}><GitBranch size={11} color={colors.muted}/><Text style={s.branchText}>{project.repo || 'Local project · no repository'}</Text><View style={s.dot}/><Text style={s.live}>{project.status}</Text></View></View>
      <Pressable style={s.more} onPress={remove}><MoreHorizontal size={18} color={colors.text}/></Pressable>
    </View>
    <View style={s.status}><View style={s.statusIcon}><Bot size={17} color={colors.primary}/></View><View style={{flex:1}}><Text style={s.statusTitle}>{project.repo?'GitHub repository connected':'Local project workspace'}</Text><Text style={s.statusSub}>{project.repo?'Repository files can be browsed below.':'Import or connect a GitHub repository to browse code.'}</Text></View><CircleDot size={13} color={project.repo?colors.green:colors.orange}/>{!project.repo?<Pressable style={s.connectRepo} onPress={()=>void openRepoPicker()}><Text style={s.connectRepoText}>Connect</Text></Pressable>:null}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs}>{['Agent','Preview','Code','Terminal','Pull requests','Actions'].map(t=><Pressable onPress={()=>{setTab(t);if(t==='Code'&&owner&&repoName)void loadFiles('');if(t==='Pull requests')void loadPullRequests();if(t==='Actions')void loadActions();}} key={t} style={[s.tab,tab===t&&s.tabActive]}>{t==='Preview'?<Eye size={14} color={tab===t?colors.primary:colors.muted}/>:t==='Code'?<FileCode2 size={14} color={tab===t?colors.primary:colors.muted}/>:t==='Terminal'?<Terminal size={14} color={tab===t?colors.primary:colors.muted}/>:t==='Actions'?<RefreshCw size={14} color={tab===t?colors.primary:colors.muted}/>:t==='Pull requests'?<GitBranch size={14} color={tab===t?colors.primary:colors.muted}/>:<Bot size={14} color={tab===t?colors.primary:colors.muted}/>}<Text style={[s.tabText,tab===t&&s.tabTextActive]}>{t}</Text></Pressable>)}</ScrollView>
    {tab==='Agent' ? <View style={s.preview}><View style={s.previewTop}><Bot size={14} color={colors.primary}/><Text style={s.previewLabel}>AI CODING AGENT · {agentBusy?'WORKING':'READY'}</Text></View><ScrollView style={{maxHeight:250}}><Text style={s.agentStatus}>{agentStatus||'Connect your GitHub repository and configure the agent server in Settings.'}</Text><Text selectable style={s.agentText}>{agentOutput||'Ask MiCode to inspect your project, implement a feature, fix bugs, or run project checks.'}</Text></ScrollView><Pressable style={s.external} disabled={publishing||!sessionId} onPress={()=>void publishChanges()}><GitBranch size={14} color={colors.primary}/><Text style={s.parentText}>{publishing?'Pushing changes…':publishedBranch?'Push another update':'Publish agent changes to GitHub branch'}</Text></Pressable></View> : tab==='Code' ? <View style={s.filePanel}>
      <View style={s.fileHeader}><View style={{flex:1}}><Text style={s.fileTitle}>Repository files</Text><Text style={s.filePath}>{owner?owner+'/'+repoName:'No GitHub repository connected'}{path?' / '+path:''}</Text></View><Pressable onPress={()=>loadFiles(path)} style={s.refresh}><RefreshCw size={16} color={colors.primary}/></Pressable></View>
      {path ? <Pressable style={s.parent} onPress={()=>loadFiles(path.split('/').slice(0,-1).join('/'))}><ArrowLeft size={14} color={colors.primary}/><Text style={s.parentText}>Parent folder</Text></Pressable>:null}
      {loadingFiles?<View style={s.loading}><ActivityIndicator color={colors.primary}/><Text style={s.emptyText}>Loading repository files…</Text></View>:
       fileError?<View style={s.loading}><Text style={s.error}>{fileError}</Text><Pressable onPress={()=>loadFiles(path)}><Text style={s.parentText}>Retry</Text></Pressable></View>:
       !owner?<View style={s.loading}><Text style={s.emptyTitle}>Connect a repository</Text><Text style={s.emptyText}>Import a GitHub repository from the Projects tab to browse its files here.</Text></View>:
       files.length===0?<View style={s.loading}><Text style={s.emptyText}>This folder is empty.</Text></View>:
       files.map(file=><Pressable key={file.path} style={s.fileRow} onPress={()=>void openFile(file)}><View style={s.fileIcon}>{file.type==='dir'?<Folder size={17} color={colors.primary}/>:<File size={17} color={colors.muted}/>}</View><View style={{flex:1}}><Text style={s.fileName}>{file.name}</Text><Text style={s.fileMeta}>{file.type==='dir'?'Folder':`${file.size.toLocaleString()} bytes`}</Text></View>{file.type==='dir'?<ChevronRight size={16} color={colors.muted}/>:null}</Pressable>)}
    </View> : tab==='Preview' ? <View style={s.preview}><View style={s.previewTop}><View style={s.windowDots}><View style={[s.windowDot,{backgroundColor:'#FF7777'}]}/><View style={[s.windowDot,{backgroundColor:'#F2C45D'}]}/><View style={[s.windowDot,{backgroundColor:'#55C98C'}]}/></View><Text style={s.previewLabel}>APP PREVIEW</Text></View><View style={s.empty}><View style={s.emptyIcon}><Eye size={25} color={colors.primary}/></View><Text style={s.emptyTitle}>Build and preview</Text><Text style={s.emptyText}>Run a production build in the isolated Docker runner. A live preview URL requires the preview proxy deployment.</Text><Pressable style={s.external} onPress={()=>void runBuild()}><RefreshCw size={14} color={colors.primary}/><Text style={s.parentText}>Build project</Text></Pressable>{previewUrl?<Pressable style={s.external} onPress={()=>Linking.openURL(previewUrl)}><ExternalLink size={14} color={colors.primary}/><Text style={s.parentText}>Open live preview</Text></Pressable>:null}{previewOutput?<Text selectable style={s.terminalOutput}>{previewOutput}</Text>:null}</View></View> :
      tab==='Terminal' ? <View style={s.preview}><View style={s.previewTop}><Terminal size={14} color={colors.muted}/><Text style={s.previewLabel}>REMOTE TERMINAL · DOCKER ISOLATED</Text></View><TextInput value={terminalCommand} onChangeText={setTerminalCommand} placeholder="npm run build" autoCapitalize="none" style={s.terminalInput}/><Pressable style={s.external} onPress={()=>void executeTerminal()}><Terminal size={14} color={colors.primary}/><Text style={s.parentText}>{terminalBusy?'Running…':'Run command'}</Text></Pressable><Text selectable style={s.terminalOutput}>{terminalOutput||'Supported: pwd, ls, git status, git diff, npm test, npm run build, npm run lint, npm run typecheck.'}</Text></View> : tab==='Pull requests' ? <View style={s.filePanel}><View style={s.fileHeader}><Text style={s.fileTitle}>Pull requests</Text><Pressable onPress={()=>void loadPullRequests()}><RefreshCw size={16} color={colors.primary}/></Pressable></View><TextInput value={prTitle} onChangeText={setPrTitle} placeholder="Pull request title" style={s.terminalInput}/><TextInput value={prBody} onChangeText={setPrBody} placeholder="Description" multiline style={s.terminalInput}/><TextInput value={prHead} onChangeText={setPrHead} placeholder="Head branch" autoCapitalize="none" style={s.terminalInput}/><TextInput value={prBase} onChangeText={setPrBase} placeholder="Base branch" autoCapitalize="none" style={s.terminalInput}/><Pressable onPress={()=>void submitPullRequest()} style={s.external}><GitBranch size={14} color={colors.primary}/><Text style={s.parentText}>Create pull request</Text></Pressable>{prItems.map(pr=><Pressable key={pr.number} onPress={()=>Linking.openURL(pr.html_url)} style={s.fileRow}><GitBranch size={15} color={colors.primary}/><View style={{flex:1}}><Text style={s.fileName}>#{pr.number} {pr.title}</Text><Text style={s.fileMeta}>{pr.head.ref} → {pr.base.ref} · @{pr.user.login}</Text></View><ExternalLink size={14} color={colors.muted}/></Pressable>)}</View> : <View style={s.filePanel}><View style={s.fileHeader}><Text style={s.fileTitle}>GitHub Actions</Text><Pressable onPress={()=>void loadActions()}><RefreshCw size={16} color={colors.primary}/></Pressable></View><TextInput value={workflowRef} onChangeText={setWorkflowRef} placeholder="Branch or ref (main)" autoCapitalize="none" style={s.terminalInput}/>{workflowItems.map(w=><View key={w.id} style={s.fileRow}><View style={{flex:1}}><Text style={s.fileName}>{w.name}</Text><Text style={s.fileMeta}>{w.path} · {w.state}</Text></View><Pressable onPress={()=>void runWorkflow(w.id)}><Text style={s.parentText}>Run</Text></Pressable></View>)}<Text style={s.fileTitle}>Recent runs</Text>{workflowRuns.map(run=><Pressable key={run.id} onPress={()=>Linking.openURL(run.html_url)} style={s.fileRow}><View style={{flex:1}}><Text style={s.fileName}>{run.name}</Text><Text style={s.fileMeta}>{run.head_branch} · {run.status} · {run.conclusion||'pending'}</Text></View><ExternalLink size={14} color={colors.muted}/></Pressable>)}</View>}
    {project.prompt ? <View style={s.initialPrompt}><Text style={s.you}>PROJECT BRIEF</Text><Text style={s.initialText}>{project.prompt}</Text></View> : null}
    <View style={s.chat}><View style={s.chatHead}><View style={s.chatAvatar}><Sparkles size={14} color={colors.primary}/></View><Text style={s.chatTitle}>Build with MiCode</Text><Text style={s.chatHint}>{agentBusy?'AGENT WORKING':'AGENT READY'}</Text></View><Text style={s.chatHelp}>MiCode can inspect and edit this connected repository using your configured secure agent backend.</Text><View style={s.composer}><TextInput value={message} onChangeText={setMessage} placeholder="Describe the next change…" placeholderTextColor="#A3A6B2" multiline style={s.input}/><Pressable disabled={!message.trim()||agentBusy} style={[s.send,(!message.trim()||agentBusy)&&{opacity:.45}]} onPress={saveRequest}><Send size={16} color="#fff"/></Pressable></View></View>
    <Modal visible={repoPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setRepoPicker(false)}><View style={s.fileModal}><View style={s.modalHead}><View style={{flex:1}}><Text style={s.fileTitle}>Connect a repository</Text><Text style={s.filePath}>Choose a repository from your GitHub account</Text></View><Pressable style={s.close} onPress={()=>setRepoPicker(false)}><X size={18} color={colors.text}/></Pressable></View>{loadingRepos?<View style={s.loading}><ActivityIndicator color={colors.primary}/><Text style={s.emptyText}>Loading repositories…</Text></View>:<ScrollView>{availableRepos.map(repo=><Pressable key={repo.id} style={s.fileRow} onPress={()=>void attachRepo(repo)}><View style={s.fileIcon}><GitBranch size={17} color={colors.primary}/></View><View style={{flex:1}}><Text style={s.fileName}>{repo.full_name}</Text><Text style={s.fileMeta}>{repo.private?'Private':'Public'} · {repo.language||'Repository'}</Text></View><ChevronRight size={16} color={colors.muted}/></Pressable>)}</ScrollView>}</View></Modal>
    <Modal visible={!!openedFile} animationType="slide" onRequestClose={()=>setOpenedFile(null)}><View style={s.fileModal}><View style={s.modalHead}><View style={{flex:1}}><Text style={s.fileTitle}>File viewer</Text><Text style={s.filePath}>{openedFile?.path}</Text></View><Pressable style={s.close} onPress={()=>setOpenedFile(null)}><X size={18} color={colors.text}/></Pressable></View><TextInput multiline value={openedFile?.content || ''} onChangeText={content=>setOpenedFile(current=>current?{...current,content}:current)} autoCapitalize="none" autoCorrect={false} spellCheck={false} style={s.editor}/><Pressable disabled={savingFile} onPress={()=>void saveOpenFile()} style={[s.saveButton,savingFile&&{opacity:.6}]}>{savingFile?<ActivityIndicator color="#fff"/>:<Send size={15} color="#fff"/>}<Text style={s.saveText}>{savingFile?'Committing…':'Commit changes to GitHub'}</Text></Pressable></View></Modal>
    {loadingFile?<View style={s.fileLoading}><ActivityIndicator color={colors.primary}/></View>:null}
  </Screen>;
}

const s=StyleSheet.create({
  content:{paddingTop:4,flexGrow:1},header:{flexDirection:'row',alignItems:'center',gap:11,marginBottom:18},
  back:{width:37,height:37,borderRadius:12,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},
  name:{fontSize:14,fontWeight:'800',color:colors.text},branch:{flexDirection:'row',alignItems:'center',gap:5,marginTop:4},branchText:{fontSize:10,color:colors.muted,flexShrink:1},dot:{width:5,height:5,borderRadius:3,backgroundColor:colors.orange,marginLeft:3},live:{fontSize:10,color:colors.muted,fontWeight:'700'},
  more:{width:36,height:36,borderRadius:12,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},
  status:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:15,padding:12,flexDirection:'row',alignItems:'center',gap:10},connectRepo:{paddingHorizontal:10,paddingVertical:7,borderRadius:9,backgroundColor:colors.primarySoft},connectRepoText:{fontSize:10,fontWeight:'800',color:colors.primary},statusIcon:{width:34,height:34,borderRadius:11,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},statusTitle:{fontSize:12,fontWeight:'800',color:colors.text},statusSub:{fontSize:10,color:colors.muted,marginTop:3},
  tabs:{flexDirection:'row',gap:6,marginTop:17,marginBottom:10},tab:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:9,borderRadius:10},tabActive:{backgroundColor:colors.primarySoft},tabText:{fontSize:11,fontWeight:'700',color:colors.muted},tabTextActive:{color:colors.primary},
  preview:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:17,minHeight:265,overflow:'hidden'},previewTop:{height:39,borderBottomWidth:1,borderBottomColor:'#F0F0F4',flexDirection:'row',alignItems:'center',paddingHorizontal:13,gap:9},windowDots:{flexDirection:'row',gap:4},windowDot:{width:7,height:7,borderRadius:4},previewLabel:{flex:1,fontSize:9,fontWeight:'800',letterSpacing:1,color:colors.muted,textAlign:'center'},
  empty:{flex:1,minHeight:225,alignItems:'center',justifyContent:'center',padding:25},emptyIcon:{width:50,height:50,borderRadius:16,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center',marginBottom:13},emptyTitle:{fontSize:13,fontWeight:'800',color:colors.text,textAlign:'center'},emptyText:{fontSize:11,color:colors.muted,textAlign:'center',lineHeight:17,marginTop:7,maxWidth:280},
  initialPrompt:{marginTop:14,padding:12,backgroundColor:'#F8F7FF',borderRadius:12},you:{fontSize:9,fontWeight:'800',letterSpacing:.8,color:colors.primary,marginBottom:5},initialText:{fontSize:11,color:colors.text,lineHeight:17},
  chat:{marginTop:16,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:17,padding:14},chatHead:{flexDirection:'row',alignItems:'center',gap:8},chatAvatar:{width:27,height:27,borderRadius:9,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},chatTitle:{fontSize:12,fontWeight:'800',color:colors.text,flex:1},chatHint:{fontSize:9,fontWeight:'800',letterSpacing:.8,color:colors.orange},chatHelp:{fontSize:11,color:colors.muted,lineHeight:17,marginTop:12,marginBottom:12},composer:{minHeight:83,borderWidth:1,borderColor:'#E4E2F1',borderRadius:13,padding:10,flexDirection:'row',alignItems:'flex-end',gap:8},input:{flex:1,fontSize:12,color:colors.text,maxHeight:100,minHeight:45,textAlignVertical:'top'},send:{width:34,height:34,borderRadius:11,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  filePanel:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:16,padding:12,minHeight:250},fileHeader:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},fileTitle:{fontSize:13,fontWeight:'800',color:colors.text},filePath:{fontSize:10,color:colors.muted,marginTop:3},refresh:{width:34,height:34,borderRadius:10,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},parent:{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:9},parentText:{fontSize:11,fontWeight:'700',color:colors.primary},fileRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderTopWidth:1,borderTopColor:'#F0F0F4'},fileIcon:{width:31,height:31,borderRadius:9,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},fileName:{fontSize:12,fontWeight:'700',color:colors.text},fileMeta:{fontSize:10,color:colors.muted,marginTop:3},loading:{minHeight:160,alignItems:'center',justifyContent:'center',gap:10},error:{fontSize:11,color:'#B54747',textAlign:'center'},external:{flexDirection:'row',alignItems:'center',gap:7,marginTop:15},fileModal:{flex:1,backgroundColor:colors.background,padding:18,paddingTop:35},modalHead:{flexDirection:'row',alignItems:'center',marginBottom:14},close:{width:35,height:35,borderRadius:11,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},editor:{flex:1,minHeight:200,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:12,padding:12,fontFamily:'monospace',fontSize:12,color:colors.text,textAlignVertical:'top',lineHeight:18},saveButton:{height:46,backgroundColor:colors.primary,borderRadius:12,marginTop:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},saveText:{fontSize:12,fontWeight:'800',color:'#fff'},agentStatus:{fontSize:10,color:colors.primary,fontWeight:'800',padding:12},agentText:{fontSize:12,color:colors.text,lineHeight:19,paddingHorizontal:12,paddingBottom:14},terminalInput:{minHeight:43,borderWidth:1,borderColor:colors.border,borderRadius:10,paddingHorizontal:11,paddingVertical:9,fontSize:12,color:colors.text,marginTop:9,backgroundColor:'#fff'},terminalOutput:{fontFamily:'monospace',fontSize:10,color:colors.text,lineHeight:16,padding:12,backgroundColor:'#F7F7FA',borderRadius:10,marginTop:10},fileLoading:{position:'absolute',top:'50%',left:'50%'}
});
