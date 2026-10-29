// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IERC721Metadata is IERC721 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface IBountyCredentialNFT is IERC721Metadata {
    function mintCredential(
        address recipient,
        uint256 bountyId,
        uint256 amount,
        address token
    ) external returns (uint256);

    function mintCredential(
        uint256 bountyId,
        address recipient,
        uint256 amount,
        address token
    ) external returns (uint256);

    function setEscrowContract(address _escrowContract) external;
    function totalCredentials() external view returns (uint256);
    function bountyToTokenId(uint256 bountyId) external view returns (uint256);
}

library Base64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        uint256 len = data.length;
        if (len == 0) return "";

        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        bytes memory table = TABLE;

        uint256 di = 0;
        uint256 si = 0;

        for (; si + 3 <= len; si += 3) {
            uint256 triple = (uint256(uint8(data[si])) << 16) |
                             (uint256(uint8(data[si + 1])) << 8) |
                             uint256(uint8(data[si + 2]));

            result[di++] = table[(triple >> 18) & 0x3f];
            result[di++] = table[(triple >> 12) & 0x3f];
            result[di++] = table[(triple >> 6) & 0x3f];
            result[di++] = table[triple & 0x3f];
        }

        if (len - si == 1) {
            uint256 triple = uint256(uint8(data[si])) << 16;
            result[di++] = table[(triple >> 18) & 0x3f];
            result[di++] = table[(triple >> 12) & 0x3f];
            result[di++] = "=";
            result[di++] = "=";
        } else if (len - si == 2) {
            uint256 triple = (uint256(uint8(data[si])) << 16) |
                             (uint256(uint8(data[si + 1])) << 8);
            result[di++] = table[(triple >> 18) & 0x3f];
            result[di++] = table[(triple >> 12) & 0x3f];
            result[di++] = table[(triple >> 6) & 0x3f];
            result[di++] = "=";
        }

        return string(result);
    }
}

contract BountyCredentialNFT is IBountyCredentialNFT {
    string public constant override name = "BountyBoard Completion Credential";
    string public constant override symbol = "BBCRED";

    address public escrowContract;
    address public owner;
    uint256 public nextTokenId = 1;

    struct Credential {
        uint256 bountyId;
        address recipient;
        uint256 amount;
        address token;
        uint256 completedAt;
    }

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => Credential) public credentials;
    mapping(uint256 => uint256) public bountyToTokenId;

    event CredentialMinted(
        uint256 indexed tokenId,
        uint256 indexed bountyId,
        address indexed recipient,
        uint256 amount,
        address token,
        uint256 completedAt
    );

    modifier onlyEscrow() {
        require(msg.sender == escrowContract, "Only escrow contract can mint");
        _;
    }

    constructor(address _escrowContract) {
        escrowContract = _escrowContract;
        owner = msg.sender;
    }

    function setEscrowContract(address _escrowContract) external override {
        require(msg.sender == owner, "Only owner can update escrow");
        require(_escrowContract != address(0), "Invalid escrow address");
        escrowContract = _escrowContract;
    }

    function mintCredential(
        address recipient,
        uint256 bountyId,
        uint256 amount,
        address token
    ) external override onlyEscrow returns (uint256) {
        return _mintCredentialInternal(bountyId, recipient, amount, token);
    }

    function mintCredential(
        uint256 bountyId,
        address recipient,
        uint256 amount,
        address token
    ) external override onlyEscrow returns (uint256) {
        return _mintCredentialInternal(bountyId, recipient, amount, token);
    }

    function _mintCredentialInternal(
        uint256 bountyId,
        address recipient,
        uint256 amount,
        address token
    ) internal returns (uint256) {
        require(recipient != address(0), "Invalid recipient address");
        require(bountyToTokenId[bountyId] == 0, "Credential already minted for this bounty");

        uint256 tokenId = nextTokenId++;

        credentials[tokenId] = Credential({
            bountyId: bountyId,
            recipient: recipient,
            amount: amount,
            token: token,
            completedAt: block.timestamp
        });

        bountyToTokenId[bountyId] = tokenId;

        _balances[recipient] += 1;
        _owners[tokenId] = recipient;

        emit Transfer(address(0), recipient, tokenId);
        emit CredentialMinted(tokenId, bountyId, recipient, amount, token, block.timestamp);

        return tokenId;
    }

    // ==========================================
    // SOULBOUND RESTRICTIONS (NON-TRANSFERABLE)
    // ==========================================

    function transferFrom(address, address, uint256) external pure override {
        revert("Soulbound: Credentials are non-transferable");
    }

    function safeTransferFrom(address, address, uint256) external pure override {
        revert("Soulbound: Credentials are non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure override {
        revert("Soulbound: Credentials are non-transferable");
    }

    function approve(address, uint256) external pure override {
        revert("Soulbound: Credentials are non-transferable");
    }

    function setApprovalForAll(address, bool) external pure override {
        revert("Soulbound: Credentials are non-transferable");
    }

    function getApproved(uint256) external pure override returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) external pure override returns (bool) {
        return false;
    }

    // ==========================================
    // STANDARD ERC-721 VIEWS
    // ==========================================

    function balanceOf(address account) external view override returns (uint256) {
        require(account != address(0), "ERC721: address zero is not a valid owner");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "ERC721: invalid token ID");
        return tokenOwner;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IBountyCredentialNFT).interfaceId;
    }

    function getCredential(uint256 tokenId) external view returns (Credential memory) {
        require(_owners[tokenId] != address(0), "ERC721: invalid token ID");
        return credentials[tokenId];
    }

    function totalCredentials() external view returns (uint256) {
        return nextTokenId - 1;
    }

    // ==========================================
    // DYNAMIC ON-CHAIN METADATA & SVG
    // ==========================================

    function tokenURI(uint256 tokenId) external view override returns (string memory) {
        require(_owners[tokenId] != address(0), "ERC721: invalid token ID");

        Credential memory cred = credentials[tokenId];
        string memory sym = getTokenSymbol(cred.token);
        string memory formattedAmt = formatAmount(cred.amount, cred.token);

        string memory svg = generateSVG(tokenId, cred.bountyId, formattedAmt, cred.recipient);
        string memory svgBase64 = Base64.encode(bytes(svg));

        string memory json = string.concat(
            '{"name":"Bounty Completion Credential #',
            toString(tokenId),
            '","description":"Verified on-chain proof of bounty completion on BountyBoard',
            '","image":"data:image/svg+xml;base64,',
            svgBase64,
            '","attributes":[{"trait_type":"Bounty ID","value":',
            toString(cred.bountyId),
            '},{"trait_type":"Amount","value":"',
            formattedAmt,
            '"},{"trait_type":"Token Symbol","value":"',
            sym,
            '"},{"trait_type":"Completion Date","value":',
            toString(cred.completedAt),
            '},{"trait_type":"Network","value":"',
            toString(block.chainid),
            '"},{"trait_type":"Recipient","value":"',
            toHexString(cred.recipient),
            '"},{"trait_type":"Soulbound","value":"True"}]}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function generateSVG(
        uint256,
        uint256 bountyId,
        string memory amountStr,
        address recipient
    ) internal pure returns (string memory) {
        string memory recipientShort = string.concat(
            substring(toHexString(recipient), 0, 6),
            "...",
            substring(toHexString(recipient), 38, 42)
        );

        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%">'
            '<defs>'
            '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">'
            '<stop offset="0%" stop-color="#0B0914"/>'
            '<stop offset="50%" stop-color="#1B1233"/>'
            '<stop offset="100%" stop-color="#2D124D"/>'
            '</linearGradient>'
            '<linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">'
            '<stop offset="0%" stop-color="#FFE082"/>'
            '<stop offset="100%" stop-color="#FFB300"/>'
            '</linearGradient>'
            '<linearGradient id="violet" x1="0%" y1="0%" x2="100%" y2="100%">'
            '<stop offset="0%" stop-color="#9D4EDD"/>'
            '<stop offset="100%" stop-color="#7928CA"/>'
            '</linearGradient>'
            '</defs>'
            '<rect x="10" y="10" width="380" height="480" rx="24" fill="url(#bg)" stroke="#7928CA" stroke-width="2"/>'
            '<circle cx="200" cy="175" r="75" fill="#7928CA" opacity="0.2"/>'
            '<rect x="140" y="115" width="120" height="120" rx="20" fill="#140D2B" stroke="url(#violet)" stroke-width="3"/>'
            '<circle cx="200" cy="175" r="38" fill="#20133E" stroke="url(#gold)" stroke-width="2"/>'
            '<text x="200" y="186" font-family="system-ui,sans-serif" font-size="30" font-weight="bold" fill="#FFE082" text-anchor="middle">&#9733;</text>'
            '<text x="200" y="62" font-family="system-ui,sans-serif" font-size="12" font-weight="bold" letter-spacing="2" fill="#A78BFA" text-anchor="middle">BOUNTYBOARD SOULBOUND</text>'
            '<text x="200" y="80" font-family="system-ui,sans-serif" font-size="10" font-weight="500" fill="#9B96AE" text-anchor="middle">VERIFIED ACHIEVEMENT CREDENTIAL</text>'
            '<rect x="110" y="260" width="180" height="32" rx="16" fill="#221543" stroke="#9D4EDD" stroke-width="1.5"/>'
            '<text x="200" y="281" font-family="system-ui,sans-serif" font-size="13" font-weight="bold" fill="#F1EEE6" text-anchor="middle">Bounty #',
            toString(bountyId),
            '</text>'
            '<text x="200" y="325" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#9B96AE" text-anchor="middle">PAYOUT EARNED</text>'
            '<text x="200" y="355" font-family="system-ui,sans-serif" font-size="20" font-weight="800" fill="#FFD54F" text-anchor="middle">',
            amountStr,
            '</text>'
            '<line x1="50" y1="390" x2="350" y2="390" stroke="#7928CA" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>'
            '<text x="200" y="420" font-family="monospace" font-size="11" fill="#C4B5FD" text-anchor="middle">',
            recipientShort,
            '</text>'
            '<rect x="125" y="440" width="150" height="22" rx="11" fill="#1A1033" stroke="#7928CA" stroke-width="1"/>'
            '<text x="200" y="455" font-family="system-ui,sans-serif" font-size="9" font-weight="bold" letter-spacing="1" fill="#A78BFA" text-anchor="middle">NON-TRANSFERABLE</text>'
            '</svg>'
        );
    }

    // ==========================================
    // UTILITY HELPERS
    // ==========================================

    function getTokenSymbol(address token) internal view returns (string memory) {
        if (token == address(0)) {
            return "ETH";
        }
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("symbol()"));
        if (success && data.length >= 32) {
            return abi.decode(data, (string));
        }
        return "USDC";
    }

    function formatAmount(uint256 amount, address token) internal pure returns (string memory) {
        if (token == address(0)) {
            uint256 whole = amount / 1e18;
            uint256 rem = (amount % 1e18) / 1e14; // 4 decimals
            if (rem == 0) {
                return string.concat(toString(whole), " ETH");
            }
            return string.concat(toString(whole), ".", padFourDigits(rem), " ETH");
        } else {
            uint256 whole = amount / 1e6;
            uint256 rem = (amount % 1e6) / 1e4; // 2 decimals
            if (rem == 0) {
                return string.concat(toString(whole), " USDC");
            }
            return string.concat(toString(whole), ".", padTwoDigits(rem), " USDC");
        }
    }

    function padFourDigits(uint256 val) internal pure returns (string memory) {
        if (val < 10) return string.concat("000", toString(val));
        if (val < 100) return string.concat("00", toString(val));
        if (val < 1000) return string.concat("0", toString(val));
        return toString(val);
    }

    function padTwoDigits(uint256 val) internal pure returns (string memory) {
        if (val < 10) return string.concat("0", toString(val));
        return toString(val);
    }

    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function toHexString(address addr) internal pure returns (string memory) {
        bytes memory buffer = new bytes(42);
        buffer[0] = "0";
        buffer[1] = "x";
        bytes memory alphabet = "0123456789abcdef";
        uint160 value = uint160(addr);
        for (uint256 i = 41; i >= 2; i--) {
            buffer[i] = alphabet[value & 0xf];
            value >>= 4;
        }
        return string(buffer);
    }

    function substring(string memory str, uint256 startIndex, uint256 endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        require(startIndex <= endIndex && endIndex <= strBytes.length, "Invalid substring indices");
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }
}
