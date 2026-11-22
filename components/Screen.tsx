import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
export function Screen({children, contentStyle, scroll=true}:{children:ReactNode;contentStyle?:ViewStyle;scroll?:boolean}) {
 return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.root}>{scroll ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content,contentStyle]}>{children}</ScrollView> : <View style={[styles.content,{flex:1},contentStyle]}>{children}</View>}</View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},root:{flex:1},content:{paddingHorizontal:20,paddingTop:12,paddingBottom:30}});
