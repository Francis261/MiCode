import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Search, Plus, FolderGit2, ChevronRight, Code2, Smartphone, Globe2, MoreHorizontal, GitBranch, RefreshCw, X, LockKeyhole, Globe, Download } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { useWorkspace, Project } from '@/lib/workspace';
import { listGitHubRepositories, GitHubRepository } from '@/lib/github';

function projectIcon(project: Project) {
  if (/mobile|expo|react native/i.test(project.prompt + project.name)) return Smartphone;
  if (/web|site|portfolio|commerce/i.test(project.prompt + project.name)) return Globe2;
  return Code2;
}
function relativeDate(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  return `Updated ${days} days ago`;
}

export default function Projects() {
  const [query, setQuery] = useState('');
  const [repoQuery, setRepoQuery] = useState('');
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [repoModal, setRepoModal] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [repoError, setRepoError] = useState('');
  const { projects, deleteProject, importRepository } = useWorkspace();
  const filtered = useMemo(() => projects.filter(project => (project.name + ' ' + (project.repo || '') + ' ' + project.prompt).toLowerCase().includes(query.toLowerCase())), [projects, query]);
  const filteredRepos = useMemo(() => repos.filter(repo => (repo.full_name + ' ' + (repo.description || '')).toLowerCase().includes(repoQuery.toLowerCase())), [repos, repoQuery]);

  const loadRepos = async () => {
    setLoadingRepos(true);
    setRepoError('');
    try { setRepos(await listGitHubRepositories()); }
    catch (error) { setRepoError(error instanceof Error ? error.message : 'Could not load GitHub repositories.'); }
    finally { setLoadingRepos(false); }
  };
  const openImport = () => { setRepoModal(true); void loadRepos(); };
  const importRepo = async (repo: GitHubRepository) => {
    setImporting(repo.id);
    try {
      const project = await importRepository(repo);
      setRepoModal(false);
      router.push({ pathname: '/project/[id]', params: { id: project.id } });
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not import this repository.');
    } finally { setImporting(null); }
  };
  const confirmDelete = (project: Project) => Alert.alert('Delete project?', `“${project.name}” will be removed from this device. The GitHub repository will not be deleted.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { void deleteProject(project.id); } },
  ]);

  return <Screen>
    <View style={s.header}><View><Text style={s.kicker}>WORKSPACE</Text><Text style={s.title}>Projects</Text><Text style={s.subtitle}>Your ideas, in progress.</Text></View><Pressable style={s.add} onPress={()=>router.push('/project/new')}><Plus color="#fff" size={20}/></Pressable></View>
    <View style={s.search}><Search size={18} color={colors.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="Search projects or repositories" placeholderTextColor="#A3A6B2" style={s.searchInput}/></View>
    <View style={s.countRow}><Text style={s.count}>{filtered.length} PROJECT{filtered.length===1?'':'S'}</Text><Text style={s.sort}>Recently updated</Text></View>
    {filtered.map(project => {
      const Icon = projectIcon(project);
      return <Pressable key={project.id} style={s.card} onPress={()=>router.push({pathname:'/project/[id]',params:{id:project.id}})} onLongPress={()=>confirmDelete(project)}>
        <View style={s.cardTop}><View style={s.icon}><Icon size={20} color={colors.primary}/></View><View style={{flex:1}}><Text style={s.name}>{project.name}</Text><Text style={s.repo}>{project.repo || 'Local project · Not connected to GitHub'}</Text></View><Pressable hitSlop={10} onPress={()=>confirmDelete(project)}><MoreHorizontal size={20} color={colors.muted}/></Pressable></View>
        <View style={s.divider}/><View style={s.cardBottom}><View style={s.branch}><FolderGit2 size={13} color={colors.muted}/><Text style={s.meta}>{project.status} · {project.visibility}</Text></View><Text style={s.updated}>{relativeDate(project.updatedAt)}</Text></View>
      </Pressable>;
    })}
    {filtered.length===0&&<View style={s.empty}><View style={s.emptyIcon}><FolderGit2 size={23} color={colors.primary}/></View><Text style={s.emptyTitle}>{query?'No matching projects':'Your workspace is empty'}</Text><Text style={s.emptyText}>{query?'Try another project name or repository.':'Create a project or import one of your GitHub repositories.'}</Text>{!query&&<Pressable style={s.emptyButton} onPress={()=>router.push('/project/new')}><Plus size={16} color="#fff"/><Text style={s.emptyButtonText}>Create project</Text></Pressable>}</View>}
    <Pressable style={s.import} onPress={openImport}><GitBranch size={19} color={colors.primary}/><View style={{flex:1}}><Text style={s.importTitle}>Import from GitHub</Text><Text style={s.importSub}>Browse repositories you can access</Text></View><ChevronRight size={18} color={colors.muted}/></Pressable>

    <Modal visible={repoModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setRepoModal(false)}>
      <View style={s.modal}>
        <View style={s.modalHeader}><View><Text style={s.kicker}>GITHUB</Text><Text style={s.modalTitle}>Import repository</Text></View><Pressable style={s.close} onPress={()=>setRepoModal(false)}><X size={19} color={colors.text}/></Pressable></View>
        <View style={s.search}><Search size={17} color={colors.muted}/><TextInput value={repoQuery} onChangeText={setRepoQuery} placeholder="Search your repositories" placeholderTextColor="#A3A6B2" style={s.searchInput}/><Pressable onPress={loadRepos}><RefreshCw size={16} color={colors.primary}/></Pressable></View>
        {loadingRepos ? <View style={s.loading}><ActivityIndicator color={colors.primary}/><Text style={s.emptyText}>Loading repositories from GitHub…</Text></View> :
          repoError ? <View style={s.loading}><Text style={s.error}>{repoError}</Text><Pressable style={s.retry} onPress={loadRepos}><Text style={s.retryText}>Try again</Text></Pressable></View> :
          <ScrollView contentContainerStyle={{paddingBottom:30}}>{filteredRepos.map(item=><View key={item.id} style={s.repoRow}><View style={s.repoIcon}>{item.private?<LockKeyhole size={17} color={colors.primary}/>:<Globe size={17} color={colors.primary}/>}</View><View style={{flex:1}}><Text style={s.name}>{item.full_name}</Text><Text style={s.repo} numberOfLines={2}>{item.description || 'No description'}</Text><Text style={s.meta}>{item.language || 'Unknown language'} · {item.private?'Private':'Public'}</Text></View><Pressable disabled={importing!==null} style={s.importButton} onPress={()=>void importRepo(item)}>{importing===item.id?<ActivityIndicator color="#fff" size="small"/>:<Download size={15} color="#fff"/>}</Pressable></View>)}{filteredRepos.length===0?<Text style={s.emptyText}>No repositories found.</Text>:null}</ScrollView>}
      </View>
    </Modal>
  </Screen>;
}

const s=StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24},kicker:{fontSize:10,fontWeight:'800',letterSpacing:1.5,color:colors.primary,marginBottom:7},
  title:{fontSize:30,fontWeight:'800',letterSpacing:-1,color:colors.text},subtitle:{fontSize:13,color:colors.muted,marginTop:5},
  add:{width:44,height:44,borderRadius:15,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  search:{height:48,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:14,flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:10},
  searchInput:{flex:1,fontSize:13,color:colors.text},countRow:{flexDirection:'row',justifyContent:'space-between',marginTop:25,marginBottom:12},
  count:{fontSize:10,fontWeight:'800',letterSpacing:1.2,color:colors.muted},sort:{fontSize:11,color:colors.muted},
  card:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:17,padding:15,marginBottom:11},
  cardTop:{flexDirection:'row',alignItems:'center',gap:12},icon:{width:42,height:42,borderRadius:13,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},
  name:{fontSize:14,fontWeight:'800',color:colors.text},repo:{fontSize:11,color:colors.muted,marginTop:4},divider:{height:1,backgroundColor:'#F0F0F4',marginVertical:13},
  cardBottom:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:5},branch:{flexDirection:'row',alignItems:'center',gap:6},meta:{fontSize:10,color:colors.muted},
  updated:{fontSize:10,color:colors.subtle},import:{marginTop:8,borderWidth:1,borderStyle:'dashed',borderColor:'#C9C4EF',borderRadius:16,padding:15,flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#F9F8FF'},
  importTitle:{fontSize:13,fontWeight:'800',color:colors.text},importSub:{fontSize:11,color:colors.muted,marginTop:4},
  empty:{alignItems:'center',padding:28,marginTop:16,backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:colors.border},
  emptyIcon:{width:48,height:48,borderRadius:15,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center',marginBottom:12},
  emptyTitle:{fontSize:14,fontWeight:'800',color:colors.text},emptyText:{fontSize:11,color:colors.muted,textAlign:'center',lineHeight:17,marginTop:8,paddingHorizontal:12},
  emptyButton:{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:colors.primary,paddingHorizontal:14,paddingVertical:10,borderRadius:11,marginTop:14},emptyButtonText:{fontSize:11,fontWeight:'800',color:'#fff'},
  modal:{flex:1,backgroundColor:colors.background,padding:20,paddingTop:25},modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18},
  modalTitle:{fontSize:24,fontWeight:'800',color:colors.text},close:{width:38,height:38,borderRadius:12,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},
  loading:{flex:1,alignItems:'center',justifyContent:'center',gap:12},error:{fontSize:12,color:'#B54747',textAlign:'center',lineHeight:18},retry:{padding:10},retryText:{fontSize:12,color:colors.primary,fontWeight:'800'},
  repoRow:{flexDirection:'row',alignItems:'center',gap:11,paddingVertical:14,borderBottomWidth:1,borderBottomColor:colors.border},repoIcon:{width:38,height:38,borderRadius:12,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},
  importButton:{width:37,height:37,borderRadius:11,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'}
});
