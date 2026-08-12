import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Linking,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat, ChatMessage } from '../../lib/chat';
import { isLocked, verifyPIN } from '../../lib/lock';
import { setFocusModeActive } from '../../lib/focus';
import { nativeContentProtection } from '../../lib/nativeContentProtection';
import { getStreak, recordVPNDisabled } from '../../lib/streak';
import PINModal from '../../components/PINModal';

export default function ChatScreen() {
    const [inputText, setInputText] = useState('');
    const { messages, isTyping, sendMessage } = useChat();
    const flatListRef = useRef<FlatList>(null);
    const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
    const insets = useSafeAreaInsets();
    const tabBarHeight = 49 + insets.bottom;

    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [pinError, setPinError] = useState<string | null>(null);
    const [pendingCommand, setPendingCommand] = useState<any>(null);
    const processedCommands = useRef(new Set<string>());
    const router = useRouter();

    // Automatically scroll to the end when messages or typing status updates
    useEffect(() => {
        if (messages.length > 0) {
            const timer = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [messages, isTyping]);

    const handleSend = () => {
        if (inputText.trim()) {
            sendMessage(inputText);
            setInputText('');
        }
    };

    const parseAndExecuteCommands = (text: string) => {
        if (!text.includes('---COMMAND---')) {
            return { displayText: text, commands: [] };
        }
        const parts = text.split('---COMMAND---');
        const displayText = parts[0].trim();
        const commands = [];
        for (let i = 1; i < parts.length; i++) {
            try {
                const jsonStr = parts[i].trim();
                if (jsonStr) {
                    commands.push(JSON.parse(jsonStr));
                }
            } catch (e) {
                console.error("Failed to parse command:", e);
            }
        }
        return { displayText, commands };
    };

    const executeCommand = async (command: any) => {
        switch (command.action) {
            case 'toggle_focus':
                if (command.value) {
                    router.push({
                        pathname: '/(tabs)/focus',
                        params: { autoStart: 'true' }
                    });
                } else {
                    setFocusModeActive(false);
                }
                break;
            case 'toggle_swp':
                const locked = await isLocked();
                if (locked) {
                    setPendingCommand(command);
                    setPinModalVisible(true);
                } else {
                    if (command.value) {
                        nativeContentProtection.start();
                    } else {
                        nativeContentProtection.stop();
                        await recordVPNDisabled();
                    }
                }
                break;
            case 'set_duration':
                router.push({
                    pathname: '/(tabs)/focus',
                    params: { duration: command.minutes?.toString() || '15', autoStart: 'true' }
                });
                break;
            case 'get_streak':
                const streak = await getStreak();
                Alert.alert("Streak", `Your current streak is ${streak.currentStreak} days!`);
                break;
            case 'get_prayer_times':
                Alert.alert("Prayer Times", "Fajr: 5:00 AM\nDhuhr: 1:30 PM\nAsr: 5:00 PM\nMaghrib: 8:00 PM\nIsha: 9:30 PM");
                break;
        }
    };

    const handlePINSubmit = async (pin: string) => {
        setPinError(null);
        const valid = await verifyPIN(pin);
        if (valid) {
            setPinModalVisible(false);
            if (pendingCommand && pendingCommand.action === 'toggle_swp') {
                if (pendingCommand.value) {
                    nativeContentProtection.start();
                } else {
                    nativeContentProtection.stop();
                    await recordVPNDisabled();
                }
            }
            setPendingCommand(null);
        } else {
            setPinError('Invalid PIN');
        }
    };

    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.sender === 'ai' && !processedCommands.current.has(lastMsg.id)) {
            processedCommands.current.add(lastMsg.id);
            const { commands } = parseAndExecuteCommands(lastMsg.text);
            commands.forEach(executeCommand);
        }
    }, [messages]);

    const toggleExpand = (id: string) => {
        setExpandedMessages(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleOpenLink = (url: string) => {
        Linking.openURL(url).catch(err => {
            console.error("Failed to open source URL:", err);
        });
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isUser = item.sender === 'user';
        const hasSources = item.sources && item.sources.length > 0;
        const isExpanded = !!expandedMessages[item.id];

        let displayText = item.text;
        if (!isUser) {
            const parsed = parseAndExecuteCommands(item.text);
            displayText = parsed.displayText;
        }

        return (
            <View style={[
                styles.messageContainer,
                isUser ? styles.userContainer : styles.aiContainer
            ]}>
                <View style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.aiBubble
                ]}>
                    <Text selectable={true} style={styles.messageText}>{displayText}</Text>

                    {/* Collapsible Sources Section */}
                    {hasSources && (
                        <View style={styles.sourcesWrapper}>
                            <TouchableOpacity
                                style={styles.sourcesHeader}
                                onPress={() => toggleExpand(item.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.sourcesTitle}>
                                    📚 Verified Sources ({item.sources!.length})
                                </Text>
                                <Text style={styles.dropdownArrow}>
                                    {isExpanded ? '▲' : '▼'}
                                </Text>
                            </TouchableOpacity>

                            {isExpanded && (
                                <View style={styles.sourcesList}>
                                    {item.sources!.map((source, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.sourceCard}
                                            onPress={() => handleOpenLink(source.url)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.sourceBookTitle} numberOfLines={1}>
                                                {source.title}
                                            </Text>
                                            <Text style={styles.sourceBookAuthor} numberOfLines={1}>
                                                By {source.author}
                                            </Text>
                                            <Text style={styles.tapToOpenText}>
                                                Tap to read on Internet Archive →
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    <Text style={styles.timestampText}>
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? tabBarHeight : 0}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Imam-AI</Text>
                    <Text style={styles.headerSubtitle}>Your companion in Islam, Ask Away !</Text>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                {isTyping && (
                    <View style={styles.typingIndicator}>
                        <ActivityIndicator size="small" color="#e2a23b" />
                        <Text style={styles.typingText}>ImamAI is thinking...</Text>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Ask a question..."
                        placeholderTextColor="#4b6465"
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || isTyping}
                    >
                        <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            <PINModal
                visible={pinModalVisible}
                onClose={() => {
                    setPinModalVisible(false);
                    setPendingCommand(null);
                    setPinError(null);
                }}
                onSubmit={handlePINSubmit}
                error={pinError || undefined}
                title="PIN Required"
                subtitle="Please enter your PIN to change this setting."
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f1718',
    },
    keyboardAvoid: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#f3f7f6',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#94a4a2',
        marginTop: 4,
    },
    listContent: {
        padding: 16,
        paddingBottom: 32,
    },
    messageContainer: {
        marginBottom: 12,
        width: '100%',
        display: 'flex',
    },
    userContainer: {
        alignItems: 'flex-end',
    },
    aiContainer: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 14,
        borderRadius: 20,
    },
    userBubble: {
        backgroundColor: '#0c3033',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        backgroundColor: '#1b2a2b',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    messageText: {
        fontSize: 16,
        color: '#f3f7f6',
        lineHeight: 22,
    },
    sourcesWrapper: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        paddingTop: 10,
    },
    sourcesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
        backgroundColor: 'rgba(226, 162, 59, 0.08)',
        borderRadius: 8,
    },
    sourcesTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#e2a23b',
    },
    dropdownArrow: {
        fontSize: 12,
        color: '#e2a23b',
    },
    sourcesList: {
        marginTop: 8,
        gap: 6,
    },
    sourceCard: {
        backgroundColor: '#111d1e',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(226, 162, 59, 0.15)',
    },
    sourceBookTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
    sourceBookAuthor: {
        fontSize: 11,
        color: '#94a4a2',
        marginTop: 2,
    },
    tapToOpenText: {
        fontSize: 10,
        color: '#e2a23b',
        fontWeight: '600',
        marginTop: 6,
        textDecorationLine: 'underline',
    },
    timestampText: {
        fontSize: 10,
        color: '#4b6465',
        alignSelf: 'flex-end',
        marginTop: 6,
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 0,
    },
    typingText: {
        color: '#94a4a2',
        fontSize: 14,
        marginLeft: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingTop: 8,
        backgroundColor: '#0b2527',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'flex-end',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#163133',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        color: '#f3f7f6',
        fontSize: 16,
        maxHeight: 120,
        minHeight: 40,
    },
    sendButton: {
        backgroundColor: '#e2a23b',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginLeft: 12,
        justifyContent: 'center',
        alignItems: 'center',
        height: 48,
    },
    sendButtonDisabled: {
        backgroundColor: '#4b6465',
        opacity: 0.5,
    },
    sendButtonText: {
        color: '#0f1718',
        fontWeight: '700',
        fontSize: 16,
    },
});
