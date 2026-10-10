import type { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

/** Move money and record a ledger entry atomically (within a transaction). */
export async function adjust(
  tx: Tx,
  walletId: string,
  amount: number, // signed kobo
  type: string,
  ref = '',
) {
  await tx.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } })
  await tx.ledgerEntry.create({ data: { walletId, amount, type, ref } })
}
