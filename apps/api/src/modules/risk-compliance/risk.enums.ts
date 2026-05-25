export enum RiskLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical'
}

export enum RiskRecordStatus {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
  Processing = 'processing',
  Approved = 'approved',
  Rejected = 'rejected',
  Resolved = 'resolved',
  Blocked = 'blocked',
  Ignored = 'ignored'
}

export enum ProfileReviewStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  RiskHold = 'risk_hold'
}

export enum ImageAuditStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  ManualReview = 'manual_review'
}

export enum ProtocolActorType {
  Customer = 'customer',
  Assistant = 'assistant',
  Admin = 'admin'
}

export enum ComplaintStatus {
  Pending = 'pending',
  Processing = 'processing',
  Resolved = 'resolved',
  Rejected = 'rejected'
}

export enum BlacklistStatus {
  Active = 'active',
  Expired = 'expired',
  Revoked = 'revoked'
}

export enum OrderExceptionStatus {
  Open = 'open',
  Processing = 'processing',
  Resolved = 'resolved',
  Ignored = 'ignored'
}
