import {BigDecimal, BigInt, Address, Bytes} from "@graphprotocol/graph-ts/index";

export const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000")
export const ZERO_BIG_DECIMAL = BigDecimal.fromString("0")
export const ZERO = BigInt.fromI32(0)
export const ONE = BigInt.fromI32(1)
export const ETH_IN_WEI = BigInt.fromString('1000000000000000000')
export const MAX_UINT_256 = BigInt.fromUnsignedBytes(Bytes.fromHexString("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff") as Bytes)

export const ONE_ETH = new BigDecimal(BigInt.fromI32(1).times(BigInt.fromI32(10).pow(18)))
export const SECONDS_IN_DAY = BigInt.fromI32(86400)
export const MONA_ON_MATIC = Address.fromString("0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5")
