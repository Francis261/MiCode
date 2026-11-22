import { Alert, Pressable, View, Text, StyleSheet } from 'react-native';
import { GitCommit, Sparkles, CheckCircle2, Clock3, FolderPlus, Pencil } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { useWorkspace, ActivityEvent } from '@/lib/workspace';

function eventIcon(event: ActivityEvent) {
  if (event.kind === 'created') return FolderPlus;
  if (event.kind === 'prompt') return Sparkles;
  return event.title.toLowerCase().includes('commit') ? GitCommit : Pencil;
}
function eventColor(event: ActivityEvent) {
  return event.kind === 'created' ? colors.green : event.kind === 'prompt' ? colors.orange : colors.primary;
}
function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

export default function Activity() {
  const { events, clearActivity } = useWorkspace();
  const confirmClear = () => Alert.alert('Clear activity history?', 'This only clears the local MiCode activity timeline. It does not change GitHub repositories or commits.', [{text:'Cancel',style:'cancel'},{text:'Clear history',style:'destructive',onPress:()=>void clearActivity()}]);
  return <Screen>
    <View style={s.header}><View><Text style={s.kicker}>YOUR WORKSPACE</Text><Text style={s.title}>Activity</Text></View>{events.length>0?<Pressable onPress={confirmClear} style={s.clear}><Text style={s.clearText}>Clear</Text></Pressable>:null}</View>
    <Text style={s.sub}>A timeline of what is happening in your workspace.</Text>
    {events.length === 0 ? <View style={s.empty}><CheckCircle2 size={25} color={colors.green}/><Text style={s.emptyTitle}>You&apos;re all caught up</Text><Text style={s.emptyText}>Project updates and workspace events will appear here.</Text></View> :
      <View style={s.timeline}>{events.map((event,i)=>{
        const Icon = eventIcon(event);
        const color = eventColor(event);
        return <View key={event.id} style={s.event}><View style={s.rail}><View style={[s.icon,{backgroundColor:event.kind==='created'?colors.greenSoft:event.kind==='prompt'?colors.orangeSoft:colors.primarySoft}]}><Icon size={17} color={color}/></View>{i!==events.length-1&&<View style={s.line}/>}</View><View style={s.body}><View style={s.time}><Clock3 size={12} color={colors.subtle}/><Text style={s.timeText}>{timeAgo(event.createdAt)}</Text></View><Text style={s.eventTitle}>{event.title}</Text>{event.projectName?<Text style={s.project}>{event.projectName}</Text>:null}<Text style={s.detail}>{event.detail}</Text></View></View>;
      })}</View>}
  </Screen>;
}

const s=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},clear:{paddingHorizontal:12,paddingVertical:8,borderRadius:10,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border},clearText:{fontSize:11,fontWeight:'800',color:'#B54747'},
  kicker:{fontSize:10,fontWeight:'800',letterSpacing:1.5,color:colors.primary,marginBottom:7},title:{fontSize:30,fontWeight:'800',letterSpacing:-1,color:colors.text},
  sub:{fontSize:13,color:colors.muted,marginTop:6,lineHeight:20},timeline:{marginTop:28},event:{flexDirection:'row',gap:14,minHeight:116},
  rail:{alignItems:'center',width:38},icon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center'},
  line:{width:1,flex:1,backgroundColor:'#DFE0E8',marginVertical:7},body:{flex:1,paddingBottom:25},
  time:{flexDirection:'row',alignItems:'center',gap:5,marginBottom:8},timeText:{fontSize:10,color:colors.subtle},
  eventTitle:{fontSize:14,fontWeight:'800',color:colors.text},project:{fontSize:11,fontWeight:'700',color:colors.primary,marginTop:4},
  detail:{fontSize:12,color:colors.muted,lineHeight:18,marginTop:7},
  empty:{alignItems:'center',padding:28,marginTop:30,backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:colors.border},
  emptyTitle:{fontSize:14,fontWeight:'800',color:colors.text,marginTop:12},emptyText:{fontSize:11,color:colors.muted,textAlign:'center',marginTop:6,lineHeight:17}
});
