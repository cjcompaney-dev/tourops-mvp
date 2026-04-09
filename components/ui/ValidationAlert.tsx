import { ValidationResult } from '../../types'

interface Props {
  result: ValidationResult
}

export default function ValidationAlert({ result }: Props) {
  if (result.errors.length === 0 && result.warnings.length === 0) return null

  return (
    <div style={{ marginBottom: 14 }}>
      {/* エラー（保存不可） */}
      {result.errors.length > 0 && (
        <div style={{
          padding: '10px 14px', marginBottom: 8,
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#B91C1C', marginBottom: 4 }}>
            ⛔ 保存できません
          </div>
          {result.errors.map((e, i) => (
            <div key={i} style={{ fontSize: 13, color: '#B91C1C' }}>・{e}</div>
          ))}
        </div>
      )}

      {/* 警告（保存は通る） */}
      {result.warnings.length > 0 && (
        <div style={{
          padding: '10px 14px',
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>
            ⚠ 確認してください（保存は可能です）
          </div>
          {result.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 13, color: '#92400E' }}>・{w}</div>
          ))}
        </div>
      )}
    </div>
  )
}
