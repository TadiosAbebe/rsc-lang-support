# MikroTik RouterOS 7.15 Export
# Router model: RB5009UG+S+IN

/interface bridge
add name=bridge1 vlan-filtering=yes comment="Main LAN Bridge"

/interface ethernet
set [ find default-name=ether1 ] comment="WAN Interface"
set [ find default-name=ether2 ] comment="LAN Trunk"

/interface wireguard
add name=wg0 listen-port=13231 comment="Site-to-Site VPN"

/interface wireguard peers
add allowed-address=10.10.10.2/32 endpoint-address=vpn.remote.net endpoint-port=13231 interface=wg0 public-key="ABCDEF1234567890="

/ip pool
add name=dhcp-pool ranges=192.168.88.10-192.168.88.254

/ip dhcp-server
add address-pool=dhcp-pool interface=bridge1 name=defconf lease-time=1d

/ip address
add address=192.168.88.1/24 interface=bridge1 network=192.168.88.0
add address=10.10.10.1/24 interface=wg0 network=10.10.10.0

/ip firewall filter
add action=accept chain=input comment="defconf: accept established,related,untracked" connection-state=established,related,untracked
add action=drop chain=input comment="defconf: drop invalid" connection-state=invalid
add action=accept chain=input comment="defconf: accept ICMP" protocol=icmp
add action=drop chain=input comment="defconf: drop all not coming from LAN" in-interface-list=!LAN
add action=accept chain=forward comment="defconf: accept established,related,untracked" connection-state=established,related,untracked
add action=drop chain=forward comment="defconf: drop invalid" connection-state=invalid
add action=drop chain=forward comment="defconf: drop all from WAN not DSTNATed" connection-nat-state=!dstnat connection-state=new in-interface-list=WAN

/ip firewall nat
add action=masquerade chain=srcnat comment="defconf: masquerade" out-interface-list=WAN

/system identity
set name="Core-Router"

