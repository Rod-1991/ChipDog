import { Text, View } from 'react-native';
import { styles } from '../styles';
import type { CardProps } from '../types';

const Card = ({ title, accent, children }: CardProps) => (
  <View style={styles.card}>
    {title ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {accent ? <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: accent }} /> : null}
        <Text style={styles.cardHeader}>{title}</Text>
      </View>
    ) : null}
    <View style={{ gap: 10 }}>{children}</View>
  </View>
);

export default Card;
