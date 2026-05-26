import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChat, ChatMessage } from '../../lib/chat';

export default function ChatScreen() {
    const [inputText, setInputText] = useState('');
    const { messages, isTyping, sendMessage } = useChat();
    const flatListRef = useRef<FlatList>(null);

    const handleSend = () => {
        if (inputText.trim()) {
            sendMessage(inputText);
            setInputText('');
        }
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isUser = item.sender === 'user';

        return (
            <View style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.aiBubble
            ]}>
                <Text style={styles.messageText}>{item.text}</Text>
                <Text style={styles.timestampText}>
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={90}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Deen AI</Text>
                    <Text style={styles.headerSubtitle}>Powered by Maktaba Shamila & Scholar verified sources</Text>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
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
    messageBubble: {
        maxWidth: '85%',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#0c3033',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
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
    timestampText: {
        fontSize: 10,
        color: '#4b6465',
        alignSelf: 'flex-end',
        marginTop: 4,
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
