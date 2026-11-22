import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WorkspaceProvider } from '@/lib/workspace';
import 'react-native-reanimated';
export default function RootLayout(){return <SafeAreaProvider><WorkspaceProvider><StatusBar style="dark"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:'#F7F8FC'}}}><Stack.Screen name="(tabs)"/><Stack.Screen name="project/new" options={{presentation:'card'}}/><Stack.Screen name="project/[id]" options={{presentation:'card'}}/></Stack></WorkspaceProvider></SafeAreaProvider>}
