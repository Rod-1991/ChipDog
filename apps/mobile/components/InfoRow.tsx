import { Text, View } from 'react-native';
import { styles } from '../styles';
import type { InfoRowProps } from '../types';

const InfoRow = ({ label, value }: InfoRowProps) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value?.trim?.() ? value : '—'}</Text>
  </View>
);

export default InfoRow;
