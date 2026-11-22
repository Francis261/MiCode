import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
export function SectionTitle({title,action}:{title:string;action?:string}) { return <View style={s.row}><Text style={s.title}>{title}</Text>{action ? <Text style={s.action}>{action}</Text>:null}</View>; }
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},title:{fontSize:17,fontWeight:'800',color:colors.text,letterSpacing:-.3},action:{fontSize:13,fontWeight:'700',color:colors.primary}});
