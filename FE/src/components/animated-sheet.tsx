import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

export function AnimatedSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}><View style={styles.overlay}>{children}</View></Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'transparent' } });
