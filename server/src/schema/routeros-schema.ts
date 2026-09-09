export interface MenuItem {
    name: string;
    description: string;
    submenus?: Record<string, MenuItem>;
    verbs?: string[];
    properties?: Record<string, string>;
}

export const COMMON_VERBS: Record<string, string> = {
    add: 'Add a new configuration item',
    set: 'Change attributes of an existing item',
    remove: 'Delete an item by number or identifier',
    enable: 'Enable an item',
    disable: 'Disable an item',
    print: 'Display list of items and their configurations',
    export: 'Export configuration to text or file',
    find: 'Search for items matching specific criteria',
    get: 'Retrieve a specific property value from an item',
    monitor: 'Real-time monitoring of status / counters',
    reset: 'Reset settings to default',
    edit: 'Edit item configuration in interactive editor',
    comment: 'Attach a comment string to an item',
    move: 'Move item order in list'
};

export const SCRIPT_KEYWORDS: Record<string, string> = {
    ':if': 'Conditional statement: :if (<condition>) do={<statements>} else={<statements>}',
    ':else': 'Alternative branch for :if statement',
    ':for': 'Counting loop: :for <var> from=<start> to=<end> step=<num> do={<statements>}',
    ':foreach': 'Iterate over array/list: :foreach <var> in=[<cmd>] do={<statements>}',
    ':while': 'Conditional loop: :while (<condition>) do={<statements>}',
    ':do': 'Execute block, optionally with on-error: :do {<statements>} on-error={<handler>}',
    ':global': 'Define or declare a global variable: :global <var> <value>',
    ':local': 'Define or declare a local variable: :local <var> <value>',
    ':set': 'Assign value to a declared variable: :set <var> <value>',
    ':unset': 'Unset or clear variable',
    ':put': 'Print output to console: :put <expression>',
    ':log': 'Write message to system log: :log (debug|info|warning|error) <message>',
    ':delay': 'Pause script execution: :delay <duration>',
    ':beep': 'Make router internal beeper sound: :beep frequency=<Hz> length=<duration>',
    ':error': 'Raise script runtime error and terminate: :error <message>',
    ':return': 'Exit current script or function and return value',
    ':resolve': 'Perform DNS lookup for hostname: :resolve <hostname>',
    ':retry': 'Retry block multiple times until success: :retry command={<cmd>} delay=<time> max=<int>',
    ':execute': 'Execute script asynchronously: :execute script=<name> or {<statements>}',
    ':parse': 'Parse string containing RouterOS commands into executable code',
    ':len': 'Return length of string or array',
    ':typeof': 'Return type of expression (str, num, ip, ip6, id, bool, array, time, nil)',
    ':pick': 'Extract substring or sub-array: :pick <var> <start> <end>',
    ':find': 'Find substring or array element: :find <var> <target> <start>',
    ':toarray': 'Convert value to array',
    ':tobool': 'Convert value to boolean',
    ':toip': 'Convert string to IPv4 address',
    ':toip6': 'Convert string to IPv6 address',
    ':tonum': 'Convert string to number',
    ':tostr': 'Convert value to string',
    ':totime': 'Convert string to time/duration'
};

export const COMMON_PROPERTIES: Record<string, string> = {
    comment: 'Human-readable description or note',
    disabled: 'Whether the item is disabled (yes/no)',
    name: 'Unique name of the interface, object, or rule',
    interface: 'Target interface name',
    address: 'IP address or subnet (e.g. 192.168.88.1/24)',
    network: 'Network address for the subnet',
    gateway: 'Gateway IP address or interface',
    action: 'Action to perform (accept, drop, reject, masquerade, redirect, etc.)',
    chain: 'Firewall chain (input, forward, output, srcnat, dstnat, etc.)',
    protocol: 'IP protocol (tcp, udp, icmp, gre, etc.)',
    'src-address': 'Source IP address or subnet',
    'dst-address': 'Destination IP address or subnet',
    'src-port': 'Source port number or range',
    'dst-port': 'Destination port number or range',
    'in-interface': 'Ingress interface',
    'out-interface': 'Egress interface',
    'in-interface-list': 'Ingress interface list',
    'out-interface-list': 'Egress interface list',
    'connection-state': 'Connection state (established, related, new, invalid, untracked)',
    'to-addresses': 'Target IP address for NAT translation',
    'to-ports': 'Target port number for NAT translation'
};

export const ROUTEROS_MENU_TREE: Record<string, MenuItem> = {
    interface: {
        name: 'interface',
        description: 'Network interface configuration and management',
        submenus: {
            bridge: {
                name: 'bridge',
                description: 'IEEE 802.1D / 802.1Q Bridge interfaces and VLAN filtering',
                verbs: ['add', 'set', 'remove', 'print', 'export', 'monitor'],
                properties: {
                    name: 'Bridge name',
                    mtu: 'Maximum transmission unit',
                    'vlan-filtering': 'Enable VLAN aware bridge filtering (yes/no)',
                    'fast-forward': 'Enable fast path processing for bridge',
                    comment: 'Comment for the bridge'
                },
                submenus: {
                    port: {
                        name: 'port',
                        description: 'Bridge member ports',
                        verbs: ['add', 'set', 'remove', 'print', 'export'],
                        properties: {
                            bridge: 'Target bridge name',
                            interface: 'Physical or virtual interface member',
                            pvid: 'Port VLAN ID',
                            'frame-types': 'admit-all, admit-only-vlan-tagged, admit-only-untagged-and-priority-tagged'
                        }
                    },
                    vlan: {
                        name: 'vlan',
                        description: 'Bridge VLAN table entries',
                        verbs: ['add', 'set', 'remove', 'print', 'export'],
                        properties: {
                            bridge: 'Target bridge name',
                            'vlan-ids': 'VLAN ID list (e.g. 10,20 or 10-50)',
                            tagged: 'List of interfaces where frames are tagged',
                            untagged: 'List of interfaces where frames are untagged'
                        }
                    }
                }
            },
            wireguard: {
                name: 'wireguard',
                description: 'WireGuard VPN interface and peer tunnels',
                verbs: ['add', 'set', 'remove', 'print', 'export'],
                properties: {
                    name: 'WireGuard interface name',
                    'listen-port': 'UDP port for WireGuard service',
                    mtu: 'MTU size',
                    'private-key': 'Base64 WireGuard private key',
                    comment: 'Comment'
                },
                submenus: {
                    peers: {
                        name: 'peers',
                        description: 'WireGuard remote peers',
                        verbs: ['add', 'set', 'remove', 'print', 'export'],
                        properties: {
                            interface: 'WireGuard interface name',
                            'public-key': 'Remote peer public key',
                            'endpoint-address': 'Remote endpoint IP address or domain',
                            'endpoint-port': 'Remote endpoint UDP port',
                            'allowed-address': 'Allowed IP networks through this peer (e.g. 10.0.0.0/24)',
                            'persistent-keepalive': 'Interval between keepalive packets',
                            'preshared-key': 'Optional preshared key for post-quantum security'
                        }
                    }
                }
            },
            ethernet: {
                name: 'ethernet',
                description: 'Physical Ethernet ports and switch chip configurations',
                verbs: ['set', 'print', 'export', 'monitor'],
                properties: {
                    name: 'Interface name',
                    speed: 'Link speed override',
                    'auto-negotiation': 'Auto-negotiation (yes/no)',
                    comment: 'Interface comment'
                }
            },
            vlan: {
                name: 'vlan',
                description: '802.1Q VLAN virtual interfaces',
                verbs: ['add', 'set', 'remove', 'print', 'export'],
                properties: {
                    name: 'VLAN interface name',
                    'vlan-id': '802.1Q VLAN ID (1-4094)',
                    interface: 'Underlying parent interface'
                }
            },
            bonding: {
                name: 'bonding',
                description: 'Link aggregation (LACP / 802.3ad) interfaces',
                verbs: ['add', 'set', 'remove', 'print', 'export']
            },
            list: {
                name: 'list',
                description: 'Logical interface lists (e.g. WAN, LAN)',
                verbs: ['add', 'set', 'remove', 'print', 'export'],
                submenus: {
                    member: {
                        name: 'member',
                        description: 'Members of interface lists',
                        verbs: ['add', 'set', 'remove', 'print', 'export'],
                        properties: {
                            list: 'Name of the interface list',
                            interface: 'Target interface name'
                        }
                    }
                }
            }
        }
    },
    ip: {
        name: 'ip',
        description: 'IPv4 configuration, routing, firewall, and services',
        submenus: {
            address: {
                name: 'address',
                description: 'IP addresses assigned to interfaces',
                verbs: ['add', 'set', 'remove', 'print', 'export', 'enable', 'disable'],
                properties: {
                    address: 'IPv4 address and subnet mask (e.g. 192.168.88.1/24)',
                    network: 'Network address of the subnet',
                    interface: 'Target interface',
                    comment: 'Comment for the IP address'
                }
            },
            firewall: {
                name: 'firewall',
                description: 'Packet filter, NAT, mangle, raw, and address lists',
                submenus: {
                    filter: {
                        name: 'filter',
                        description: 'Firewall packet filter rules',
                        verbs: ['add', 'set', 'remove', 'print', 'export', 'enable', 'disable', 'move'],
                        properties: {
                            chain: 'input, forward, output',
                            action: 'accept, drop, reject, jump, log, passthrough, fasttrack-connection',
                            protocol: 'tcp, udp, icmp, gre, esp, etc.',
                            'src-address': 'Source IP or CIDR subnet',
                            'dst-address': 'Destination IP or CIDR subnet',
                            'src-port': 'Source port number or range',
                            'dst-port': 'Destination port number or range',
                            'in-interface': 'Ingress interface',
                            'out-interface': 'Egress interface',
                            'in-interface-list': 'Ingress interface list',
                            'out-interface-list': 'Egress interface list',
                            'connection-state': 'established, related, new, invalid, untracked',
                            'connection-nat-state': 'srcnat, dstnat',
                            'tcp-flags': 'syn, ack, fin, rst, psh, urg',
                            log: 'Whether to log matching packets (yes/no)',
                            'log-prefix': 'Prefix string added to log entry',
                            comment: 'Description of firewall rule'
                        }
                    },
                    nat: {
                        name: 'nat',
                        description: 'Network Address Translation (source NAT and destination NAT)',
                        verbs: ['add', 'set', 'remove', 'print', 'export', 'enable', 'disable', 'move'],
                        properties: {
                            chain: 'srcnat, dstnat',
                            action: 'masquerade, src-nat, dst-nat, redirect, netmap',
                            'to-addresses': 'Target IP address for translation',
                            'to-ports': 'Target port for translation',
                            protocol: 'tcp, udp, icmp',
                            'src-address': 'Source address',
                            'dst-address': 'Destination address',
                            'out-interface-list': 'Egress interface list for masquerade (e.g. WAN)',
                            comment: 'Comment'
                        }
                    },
                    mangle: {
                        name: 'mangle',
                        description: 'Packet marking, routing marks, and TTL modification',
                        verbs: ['add', 'set', 'remove', 'print', 'export', 'enable', 'disable', 'move']
                    },
                    raw: {
                        name: 'raw',
                        description: 'Firewall rules applied before connection tracking',
                        verbs: ['add', 'set', 'remove', 'print', 'export', 'enable', 'disable', 'move']
                    },
                    'address-list': {
                        name: 'address-list',
                        description: 'Named lists of IP addresses and subnets for firewall matching',
                        verbs: ['add', 'set', 'remove', 'print', 'export', 'enable', 'disable'],
                        properties: {
                            list: 'Name of the address list',
                            address: 'IP address or subnet to add',
                            timeout: 'Optional temporary duration before entry expires',
                            comment: 'Comment'
                        }
                    }
                }
            },
            route: {
                name: 'route',
                description: 'Static routing table',
                verbs: ['add', 'set', 'remove', 'print', 'export', 'enable', 'disable'],
                properties: {
                    'dst-address': 'Destination network prefix (e.g. 0.0.0.0/0 for default gateway)',
                    gateway: 'Next-hop IP address or interface',
                    distance: 'Administrative distance (metric)',
                    'routing-table': 'Target routing table in v7 (main by default)',
                    'check-gateway': 'ping, bfd',
                    comment: 'Route description'
                }
            },
            'dhcp-server': {
                name: 'dhcp-server',
                description: 'DHCP server daemon',
                verbs: ['add', 'set', 'remove', 'print', 'export', 'enable', 'disable'],
                submenus: {
                    network: {
                        name: 'network',
                        description: 'DHCP network scope and options',
                        verbs: ['add', 'set', 'remove', 'print', 'export'],
                        properties: {
                            address: 'Subnet network and prefix (e.g. 192.168.88.0/24)',
                            gateway: 'Default gateway IP provided to clients',
                            'dns-server': 'DNS servers provided to clients',
                            'domain': 'Domain search name'
                        }
                    },
                    lease: {
                        name: 'lease',
                        description: 'DHCP client leases (dynamic and static)',
                        verbs: ['add', 'set', 'remove', 'print', 'export', 'make-static']
                    }
                }
            },
            'dhcp-client': {
                name: 'dhcp-client',
                description: 'DHCP client for WAN interfaces',
                verbs: ['add', 'set', 'remove', 'print', 'export', 'enable', 'disable'],
                properties: {
                    interface: 'Target WAN interface',
                    'add-default-route': 'yes, no, special-class',
                    'use-peer-dns': 'Use DNS servers received via DHCP (yes/no)',
                    'use-peer-ntp': 'Use NTP servers received via DHCP (yes/no)'
                }
            },
            pool: {
                name: 'pool',
                description: 'IP address pools for DHCP, VPN, Hotspot',
                verbs: ['add', 'set', 'remove', 'print', 'export'],
                properties: {
                    name: 'Pool name',
                    ranges: 'IP range(s), e.g. 192.168.88.10-192.168.88.254'
                }
            },
            dns: {
                name: 'dns',
                description: 'DNS client and caching resolver',
                verbs: ['set', 'print', 'export'],
                properties: {
                    servers: 'Comma-separated upstream DNS server IPs (e.g. 1.1.1.1,8.8.8.8)',
                    'allow-remote-requests': 'Act as caching DNS server for LAN (yes/no)'
                },
                submenus: {
                    static: {
                        name: 'static',
                        description: 'Static DNS host and regex entries',
                        verbs: ['add', 'set', 'remove', 'print', 'export']
                    }
                }
            }
        }
    },
    routing: {
        name: 'routing',
        description: 'Dynamic routing protocols (BGP, OSPF, RIP) and routing tables',
        submenus: {
            table: {
                name: 'table',
                description: 'Routing tables in RouterOS v7',
                verbs: ['add', 'set', 'remove', 'print', 'export']
            },
            rule: {
                name: 'rule',
                description: 'Policy routing rules',
                verbs: ['add', 'set', 'remove', 'print', 'export']
            },
            bgp: {
                name: 'bgp',
                description: 'BGP protocol configuration',
                submenus: {
                    connection: {
                        name: 'connection',
                        description: 'BGP connections and peers in v7',
                        verbs: ['add', 'set', 'remove', 'print', 'export']
                    }
                }
            },
            ospf: {
                name: 'ospf',
                description: 'OSPF protocol configuration'
            }
        }
    },
    system: {
        name: 'system',
        description: 'System configuration, identity, packages, scripts, users',
        submenus: {
            identity: {
                name: 'identity',
                description: 'Device hostname / identity',
                verbs: ['set', 'print', 'export'],
                properties: {
                    name: 'Device system name / hostname'
                }
            },
            clock: {
                name: 'clock',
                description: 'System clock and time zone',
                verbs: ['set', 'print', 'export']
            },
            logging: {
                name: 'logging',
                description: 'System logging rules and actions',
                verbs: ['add', 'set', 'remove', 'print', 'export']
            },
            script: {
                name: 'script',
                description: 'Stored executable scripts',
                verbs: ['add', 'set', 'remove', 'print', 'export', 'run'],
                properties: {
                    name: 'Script name',
                    source: 'Script source code body',
                    policy: 'Required permissions (read, write, policy, test, etc.)',
                    'dont-require-permissions': 'Whether script requires user permissions'
                }
            },
            scheduler: {
                name: 'scheduler',
                description: 'Automated task scheduler',
                verbs: ['add', 'set', 'remove', 'print', 'export', 'enable', 'disable'],
                properties: {
                    name: 'Task name',
                    'on-event': 'Script name or code to execute',
                    'start-date': 'Start date',
                    'start-time': 'Start time or startup',
                    interval: 'Execution recurrence interval (e.g. 1d, 1h, 10m)'
                }
            },
            user: {
                name: 'user',
                description: 'Administrator and operator user accounts',
                verbs: ['add', 'set', 'remove', 'print', 'export']
            },
            routerboard: {
                name: 'routerboard',
                description: 'RouterBOARD hardware info and firmware',
                verbs: ['print', 'upgrade']
            },
            resource: {
                name: 'resource',
                description: 'System resource usage (CPU, RAM, Uptime)',
                verbs: ['print']
            },
            package: {
                name: 'package',
                description: 'Installed RouterOS packages',
                verbs: ['print', 'update']
            }
        }
    },
    tool: {
        name: 'tool',
        description: 'Diagnostic and monitoring tools',
        submenus: {
            ping: { name: 'ping', description: 'ICMP ping tool' },
            traceroute: { name: 'traceroute', description: 'Traceroute tool' },
            profile: { name: 'profile', description: 'Per-CPU core load profiler' },
            torch: { name: 'torch', description: 'Real-time traffic monitor per IP/port' },
            netwatch: { name: 'netwatch', description: 'ICMP/TCP host availability monitor with alert triggers' },
            fetch: { name: 'fetch', description: 'Download or upload files via HTTP, HTTPS, FTP, or SFTP' },
            'e-mail': { name: 'e-mail', description: 'SMTP email sending tool' }
        }
    }
};

