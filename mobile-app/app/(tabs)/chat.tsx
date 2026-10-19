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
    Alert,
    Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useChat, ChatMessage, ChatSession, getSessionDisplayTitle } from '../../lib/chat';
import { Masjid, formatDistance } from '../../lib/masjid';
import { isLocked, verifyPIN } from '../../lib/lock';
import { setFocusModeActive } from '../../lib/focus';
import { nativeContentProtection } from '../../lib/nativeContentProtection';
import { getStreak, recordVPNDisabled } from '../../lib/streak';
import PINModal from '../../components/PINModal';

const SUGGESTED_QUESTIONS = [
    "How to maintain consistency in Fajr prayer?",
    "What is the ruling on fasting while traveling?",
    "Dua for overcoming anxiety and intrusive doubts",
    "Explain the virtues and timings of Tahajjud",
];

export default function ChatScreen() {
    const [inputText, setInputText] = useState('');
    const {
        messages,
        isTyping,
        sendMessage,
        sessions,
        currentSession,
        currentSessionId,
        startNewChat,
        switchSession,
        removeSession,
    } = useChat();
    const flatListRef = useRef<FlatList>(null);
    const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
    const [sessionsModalVisible, setSessionsModalVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const tabBarHeight = 49 + insets.bottom;

    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [pinError, setPinError] = useState<string | null>(null);
    const [pendingCommand, setPendingCommand] = useState<any>(null);
    const processedCommands = useRef(new Set<string>());
    const router = useRouter();

    const formatSessionTime = (timestamp: number) => {
        const d = new Date(timestamp);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const handleDeleteSession = (session: ChatSession) => {
        Alert.alert(
            "Delete Conversation",
            `Are you sure you want to delete "${session.title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => removeSession(session.id)
                }
            ]
        );
    };

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
            case 'start_focus':
                router.push({
                    pathname: '/(tabs)/focus',
                    params: { duration: (command.minutes || 10).toString(), autoStart: 'true' }
                });
                break;
            case 'find_masjid':
                // Masjids are pre-resolved and displayed inline inside the chat message!
                break;
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

    const openMasjidInMaps = async (masjid: Masjid) => {
        const destLat = masjid.latitude;
        const destLng = masjid.longitude;
        let url = Platform.OS === 'ios'
            ? `maps://app?daddr=${destLat},${destLng}`
            : `google.navigation:q=${destLat},${destLng}&mode=d`;

        const canOpen = await Linking.canOpenURL(url).catch(() => false);
        if (!canOpen) {
            url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
        }
        try {
            await Linking.openURL(url);
        } catch (e) {
            Alert.alert("Directions", `Unable to open Google Maps navigation.`);
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
                                     Verified Sources ({item.sources!.length})
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

                    {/* Inline Masjid Results Cards */}
                    {item.masjids && item.masjids.length > 0 && (
                        <View style={styles.masjidResultsWrapper}>
                            <View style={styles.masjidResultsHeader}>
                                <Feather name="map-pin" size={13} color="#00ff66" />
                                <Text style={styles.masjidResultsTitle}>
                                    Masajid Found ({item.masjids.length})
                                </Text>
                            </View>
                            {item.masjids.map((m) => (
                                <View key={m.id} style={styles.inlineMasjidCard}>
                                    <View style={styles.inlineMasjidTop}>
                                        <Text style={styles.inlineMasjidName} numberOfLines={1}>{m.name}</Text>
                                        <Text style={styles.inlineMasjidDistance}>{formatDistance(m.distance)}</Text>
                                    </View>
                                    <Text style={styles.inlineMasjidAddress} numberOfLines={2}>{m.address}</Text>
                                    {m.school && (
                                        <Text style={styles.inlineMasjidSchool}>{m.school}</Text>
                                    )}
                                    <TouchableOpacity
                                        style={styles.inlineDirectionsButton}
                                        onPress={() => openMasjidInMaps(m)}
                                        activeOpacity={0.8}
                                    >
                                        <Feather name="navigation" size={13} color="#0b1b1c" style={{ marginRight: 6 }} />
                                        <Text style={styles.inlineDirectionsText}>Get Directions (Google Maps)</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Quick Focus Action Button */}
                    {item.actionCommand && (item.actionCommand.action === 'start_focus' || item.actionCommand.action === 'set_duration') && (
                        <TouchableOpacity
                            style={styles.inlineFocusButton}
                            onPress={() => router.push({
                                pathname: '/(tabs)/focus',
                                params: { duration: (item.actionCommand?.minutes || 10).toString(), autoStart: 'true' }
                            })}
                            activeOpacity={0.8}
                        >
                            <Feather name="play-circle" size={15} color="#0f1718" style={{ marginRight: 6 }} />
                            <Text style={styles.inlineFocusText}>
                                Start {item.actionCommand.minutes || 10}-Minute Focus Session
                            </Text>
                        </TouchableOpacity>
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
                    <View style={styles.headerContentRow}>
                        <View style={styles.headerTitleRow}>
                            <View style={styles.headerAvatar}>
                                <Feather name="message-circle" size={20} color="#0f1718" />
                            </View>
                            <View style={styles.headerTextWrap}>
                                <Text style={styles.headerTitle} numberOfLines={1}>
                                    {currentSession && getSessionDisplayTitle(currentSession) !== 'New Conversation'
                                        ? getSessionDisplayTitle(currentSession)
                                        : 'Imam AI'}
                                </Text>
                                <Text style={styles.headerSubtitle} numberOfLines={1}>
                                    Verified Scholarly RAG via Internet Archive
                                </Text>
                            </View>
                        </View>

                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.headerActionBtn}
                                onPress={() => setSessionsModalVisible(true)}
                                activeOpacity={0.7}
                                accessibilityLabel="Chat Sessions History"
                            >
                                <Feather name="clock" size={18} color="#e2a23b" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.headerActionBtn, styles.newChatBtn]}
                                onPress={() => startNewChat()}
                                activeOpacity={0.7}
                                accessibilityLabel="Start New Chat"
                            >
                                <Feather name="plus" size={18} color="#0f1718" />
                            </TouchableOpacity>
                        </View>
                    </View>
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
                    ListHeaderComponent={
                        messages.length <= 1 ? (
                            <View style={styles.suggestionsContainer}>
                                <View style={styles.suggestionsHeaderRow}>
                                    <Feather name="compass" size={14} color="#e2a23b" />
                                    <Text style={styles.suggestionsTitle}>Suggested Inquiries</Text>
                                </View>
                                <View style={styles.chipsWrapper}>
                                    {SUGGESTED_QUESTIONS.map((q, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.suggestionChip}
                                            onPress={() => sendMessage(q)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.suggestionChipText}>{q}</Text>
                                            <Feather name="arrow-up-right" size={14} color="#e2a23b" />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : null
                    }
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

            {/* Sessions History Modal */}
            <Modal
                visible={sessionsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSessionsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleRow}>
                                <Feather name="message-square" size={20} color="#e2a23b" />
                                <Text style={styles.modalTitle}>Chat Conversations</Text>
                                <View style={styles.modalBadge}>
                                    <Text style={styles.modalBadgeText}>{sessions.length}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setSessionsModalVisible(false)}
                            >
                                <Feather name="x" size={20} color="#94a4a2" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.modalNewChatBtn}
                            onPress={async () => {
                                await startNewChat();
                                setSessionsModalVisible(false);
                            }}
                            activeOpacity={0.8}
                        >
                            <Feather name="plus-circle" size={18} color="#e2a23b" />
                            <Text style={styles.modalNewChatText}>Start New Conversation</Text>
                        </TouchableOpacity>

                        <FlatList
                            data={sessions}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.sessionsList}
                            renderItem={({ item }) => {
                                const isActive = item.id === currentSessionId;
                                const msgCount = item.messages.filter(m => m.id !== 'welcome').length;
                                return (
                                    <TouchableOpacity
                                        style={[styles.sessionCard, isActive && styles.sessionCardActive]}
                                        onPress={async () => {
                                            await switchSession(item.id);
                                            setSessionsModalVisible(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.sessionCardLeft}>
                                            <Feather
                                                name={isActive ? "check-circle" : "message-circle"}
                                                size={18}
                                                color={isActive ? "#e2a23b" : "#4b6465"}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={[styles.sessionCardTitle, isActive && styles.sessionCardTitleActive]}
                                                    numberOfLines={1}
                                                >
                                                    {getSessionDisplayTitle(item)}
                                                </Text>
                                                <View style={styles.sessionCardMetaRow}>
                                                    <Text style={styles.sessionCardMetaText}>
                                                        {formatSessionTime(item.updatedAt)}
                                                    </Text>
                                                    <Text style={styles.sessionCardDot}>•</Text>
                                                    <Text style={styles.sessionCardMetaText}>
                                                        {msgCount === 1 ? '1 query' : `${msgCount} queries`}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.deleteSessionBtn}
                                            onPress={() => handleDeleteSession(item)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Feather name="trash-2" size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptySessions}>
                                    <Text style={styles.emptySessionsText}>No conversations yet.</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
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
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerTextWrap: {
        flex: 1,
        marginRight: 8,
    },
    headerAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#e2a23b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#f3f7f6',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#94a4a2',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(226, 162, 59, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(226, 162, 59, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    newChatBtn: {
        backgroundColor: '#e2a23b',
        borderColor: '#e2a23b',
    },
    suggestionsContainer: {
        marginBottom: 16,
        backgroundColor: '#0c3033',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(226, 162, 59, 0.2)',
    },
    suggestionsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    suggestionsTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffdda8',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    chipsWrapper: {
        gap: 8,
    },
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(226, 162, 59, 0.08)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(226, 162, 59, 0.22)',
    },
    suggestionChipText: {
        fontSize: 13,
        color: '#f3f7f6',
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
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
    masjidResultsWrapper: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    masjidResultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    masjidResultsTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#00ff66',
        marginLeft: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inlineMasjidCard: {
        backgroundColor: '#0a1d1e',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.25)',
    },
    inlineMasjidTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    inlineMasjidName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#f3f7f6',
        flex: 1,
        marginRight: 8,
    },
    inlineMasjidDistance: {
        fontSize: 12,
        fontWeight: '700',
        color: '#e2a23b',
    },
    inlineMasjidAddress: {
        fontSize: 12,
        color: '#94a4a2',
        marginBottom: 6,
        lineHeight: 16,
    },
    inlineMasjidSchool: {
        fontSize: 11,
        color: '#2dd4bf',
        fontWeight: '600',
        marginBottom: 8,
    },
    inlineDirectionsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00ff66',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 4,
    },
    inlineDirectionsText: {
        color: '#0b1b1c',
        fontWeight: '700',
        fontSize: 13,
    },
    inlineFocusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e2a23b',
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginTop: 10,
    },
    inlineFocusText: {
        color: '#0f1718',
        fontWeight: '700',
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f1718',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        maxHeight: '80%',
        paddingBottom: 32,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    modalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f3f7f6',
    },
    modalBadge: {
        backgroundColor: 'rgba(226, 162, 59, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    modalBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#e2a23b',
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#162325',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalNewChatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#162325',
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(226, 162, 59, 0.3)',
    },
    modalNewChatText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#e2a23b',
    },
    sessionsList: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 20,
    },
    sessionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#122325',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    sessionCardActive: {
        borderColor: 'rgba(226, 162, 59, 0.5)',
        backgroundColor: 'rgba(226, 162, 59, 0.08)',
    },
    sessionCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        marginRight: 10,
    },
    sessionCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f3f7f6',
        marginBottom: 4,
    },
    sessionCardTitleActive: {
        color: '#e2a23b',
    },
    sessionCardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sessionCardMetaText: {
        fontSize: 11,
        color: '#94a4a2',
    },
    sessionCardDot: {
        fontSize: 11,
        color: '#4b6465',
    },
    deleteSessionBtn: {
        padding: 6,
        borderRadius: 8,
    },
    emptySessions: {
        paddingVertical: 32,
        alignItems: 'center',
    },
    emptySessionsText: {
        fontSize: 13,
        color: '#94a4a2',
    },
});
