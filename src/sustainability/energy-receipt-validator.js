export function validateEnergyReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    throw new Error('Energy receipt is required');
  }

  if (!Number.isFinite(receipt.estimatedEnergyWh) || receipt.estimatedEnergyWh < 0) {
    throw new Error('Invalid energy estimate');
  }

  if (receipt.renewableRatio !== undefined &&
      (receipt.renewableRatio < 0 || receipt.renewableRatio > 1)) {
    throw new Error('Invalid renewable ratio');
  }

  return Object.freeze({ ...receipt, validated: true });
}
